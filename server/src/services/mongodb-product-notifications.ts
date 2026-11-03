import { randomUUID } from 'node:crypto'
import { database, databaseError } from '../config/database.js'
import { getProductModel } from '../models/product.js'
import { HttpError } from '../middleware/errors.js'
import { NotificationError, type TelegramSender } from './telegram.js'
import type {
  ProductNotifications,
  NotificationResult,
} from './product-notifications.js'

const delays = [60_000, 300_000, 1_800_000]
const safeCodes = new Set([
  'configuration',
  'network',
  'rate_limit',
  'provider_unavailable',
  'provider_rejected',
  'invalid_response',
])

export function createMongoProductNotifications(
  sender?: TelegramSender,
  clock: () => Date = () => new Date()
): ProductNotifications {
  const Product = getProductModel(database)
  const options = { timeoutMS: 5000, maxTimeMS: 5000, timestamps: false }
  const availableLease = (now: Date) => ({
    $or: [
      { 'notification.leaseUntil': { $exists: false } },
      { 'notification.leaseUntil': { $lte: now } },
    ],
  })
  async function query<T>(operation: () => Promise<T>): Promise<T> {
    try {
      if (database.readyState !== 1)
        throw new HttpError(503, 'Notifications are unavailable')
      return await operation()
    } catch (error) {
      throw databaseError(error)
    }
  }
  const sendProductNotification = async (
    id: string
  ): Promise<NotificationResult> => {
    const now = clock()
    // A crash on the final attempt must not strand the job in pending forever.
    const exhausted = await query(() =>
      Product.updateOne(
        {
          _id: id,
          'notification.channel': 'telegram',
          'notification.status': 'pending',
          'notification.attempts': { $gte: 4 },
          ...availableLease(now),
        },
        {
          $set: {
            'notification.status': 'failed',
            'notification.errorCode': 'attempts_exhausted',
          },
          $unset: {
            'notification.leaseToken': '',
            'notification.leaseUntil': '',
            'notification.nextAttemptAt': '',
          },
        },
        options
      ).exec()
    )
    if (exhausted.modifiedCount) return 'failed'
    const token = randomUUID()
    const record = await query(() =>
      Product.findOneAndUpdate(
        {
          _id: id,
          'notification.channel': 'telegram',
          'notification.status': 'pending',
          'notification.attempts': { $lt: 4 },
          'notification.nextAttemptAt': { $lte: now },
          ...availableLease(now),
        },
        {
          $set: {
            'notification.leaseToken': token,
            'notification.leaseUntil': new Date(now.getTime() + 60000),
          },
          $inc: { 'notification.attempts': 1 },
        },
        { ...options, returnDocument: 'after' }
      )
        .lean()
        .exec()
    )
    if (!record?.notification) return 'skipped'
    const job = record.notification
    const fence = {
      _id: id,
      'notification.status': 'pending' as const,
      'notification.leaseToken': token,
    }
    try {
      if (!sender) throw new NotificationError('configuration', false)
      const payload = job.payload ?? sender.prepare(job.snapshot)
      const prepared = await query(() =>
        Product.updateOne(
          { ...fence, 'notification.leaseUntil': { $gt: clock() } },
          {
            $set: {
              'notification.payload': payload,
              'notification.firstAttemptAt': job.firstAttemptAt ?? clock(),
            },
          },
          options
        ).exec()
      )
      if (!prepared.matchedCount) return 'skipped'
      const result = await sender.send(payload)
      const saved = await query(() =>
        Product.updateOne(
          fence,
          {
            $set: {
              'notification.status': 'sent',
              'notification.providerMessageId': result.messageId,
            },
            $unset: {
              'notification.errorCode': '',
              'notification.leaseToken': '',
              'notification.leaseUntil': '',
              'notification.nextAttemptAt': '',
            },
          },
          options
        ).exec()
      )
      return saved.matchedCount ? 'sent' : 'skipped'
    } catch (error) {
      // A persistence failure after provider acceptance leaves the original
      // lease intact; recovery may duplicate a Telegram message already accepted.
      if (!(error instanceof NotificationError)) throw error
      const failure = error
      const retry = failure.retryable && job.attempts < 4
      const saved = await query(() =>
        Product.updateOne(
          fence,
          {
            $set: {
              'notification.status': retry ? 'pending' : 'failed',
              'notification.errorCode': safeCodes.has(failure.code)
                ? failure.code
                : 'provider_rejected',
              ...(retry
                ? {
                    'notification.nextAttemptAt': new Date(
                      clock().getTime() +
                        Math.max(delays[job.attempts - 1], failure.retryAfterMs)
                    ),
                  }
                : {}),
            },
            $unset: {
              'notification.leaseToken': '',
              'notification.leaseUntil': '',
              ...(retry ? {} : { 'notification.nextAttemptAt': '' }),
            },
          },
          options
        ).exec()
      )
      return saved.matchedCount ? (retry ? 'deferred' : 'failed') : 'skipped'
    }
  }
  return {
    sendProductNotification,
    async processProductNotifications() {
      const jobs = await query(() =>
        Product.find({
          'notification.channel': 'telegram',
          'notification.status': 'pending',
          'notification.nextAttemptAt': { $lte: clock() },
          ...availableLease(clock()),
        })
          .sort({ 'notification.nextAttemptAt': 1, _id: 1 })
          .limit(10)
          .select('_id')
          .setOptions(options)
          .lean()
          .exec()
      )
      let processed = 0
      for (const job of jobs)
        if ((await sendProductNotification(job._id)) !== 'skipped') processed++
      return { processed }
    },
    async retry(id) {
      const record = await query(() =>
        Product.findOneAndUpdate(
          {
            _id: id,
            'notification.channel': 'telegram',
            'notification.status': { $in: ['pending', 'failed'] },
            ...availableLease(clock()),
          },
          {
            $set: {
              'notification.channel': 'telegram',
              'notification.status': 'pending',
              'notification.attempts': 0,
              'notification.nextAttemptAt': clock(),
            },
            $unset: {
              'notification.errorCode': '',
              'notification.leaseToken': '',
              'notification.leaseUntil': '',
            },
          },
          { ...options, returnDocument: 'after' }
        )
          .lean()
          .exec()
      )
      if (!record) {
        const exists = await query(() =>
          Product.exists({ _id: id }).setOptions(options).exec()
        )
        throw new HttpError(
          exists ? 409 : 404,
          exists
            ? 'Notification is already sent, processing, or was not requested'
            : 'Product not found'
        )
      }
      return sendProductNotification(id)
    },
  }
}

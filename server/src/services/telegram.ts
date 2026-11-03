import { z } from 'zod'

export type NotificationSnapshot = {
  id: string
  name: string
  price: number
  ownerId: string
  createdAt: string
}
export type TelegramMessage = {
  chatId: string
  text: string
  productUrl: string
  adminUrl: string
}
export interface TelegramSender {
  prepare(event: NotificationSnapshot): TelegramMessage
  send(message: TelegramMessage): Promise<{ messageId: string }>
}
export class NotificationError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly retryAfterMs = 0
  ) {
    super('Notification request failed: ' + code)
  }
}
const settingsSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .trim()
    .regex(/^\d+:[A-Za-z0-9_-]{20,}$/),
  TELEGRAM_ADMIN_CHAT_ID: z
    .string()
    .trim()
    .regex(/^[1-9]\d{0,15}$/),
  PUBLIC_SITE_URL: z
    .url()
    .max(256)
    .refine(value => {
      const url = new URL(value)
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === '/'
      )
    }),
})
const responseSchema = z.object({
  ok: z.boolean(),
  error_code: z.number().int().optional(),
  parameters: z
    .object({
      retry_after: z.number().int().nonnegative().max(86400).optional(),
    })
    .optional(),
  result: z.object({ message_id: z.number().int().positive() }).optional(),
})
// Limit each untrusted field without splitting a Unicode surrogate pair.
const shorten = (value: string, length: number) =>
  Array.from(value).slice(0, length).join('')

export function createTelegramSender(
  settings: Record<string, unknown>,
  request: typeof fetch = fetch
): TelegramSender | undefined {
  const parsed = settingsSchema.safeParse(settings)
  if (!parsed.success) return undefined
  const config = parsed.data
  return {
    prepare(event) {
      return {
        chatId: config.TELEGRAM_ADMIN_CHAT_ID,
        text: [
          'Новый товар опубликован',
          shorten(event.name, 1000),
          `Цена: $${event.price.toFixed(2)}`,
          `Автор: ${shorten(event.ownerId, 200)}`,
          `Дата: ${shorten(event.createdAt, 80)}`,
          `ID товара: ${shorten(event.id, 200)}`,
        ].join('\n'),
        productUrl: new URL(
          '/product/' + encodeURIComponent(event.id),
          config.PUBLIC_SITE_URL
        ).href,
        adminUrl: new URL('/admin/products', config.PUBLIC_SITE_URL).href,
      }
    },
    async send(message) {
      try {
        const response = await request(
          `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: message.chatId,
              text: message.text,
              allow_paid_broadcast: false,
              link_preview_options: { is_disabled: true },
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Открыть товар', url: message.productUrl },
                    { text: 'Админ-панель', url: message.adminUrl },
                  ],
                ],
              },
            }),
          }
        )
        const body = responseSchema.safeParse(
          await response.json().catch(() => null)
        )
        if (!response.ok || (body.success && !body.data.ok)) {
          const status = !response.ok
            ? response.status
            : body.success
              ? body.data.error_code
              : undefined
          const temporary =
            status === 429 || (status !== undefined && status >= 500)
          throw new NotificationError(
            status === 429
              ? 'rate_limit'
              : temporary
                ? 'provider_unavailable'
                : 'provider_rejected',
            temporary,
            body.success ? (body.data.parameters?.retry_after ?? 0) * 1000 : 0
          )
        }
        if (!body.success || !body.data.ok || !body.data.result)
          throw new NotificationError('invalid_response', true)
        return { messageId: String(body.data.result.message_id) }
      } catch (error) {
        if (error instanceof NotificationError) throw error
        // fetch errors can contain the request URL and therefore the bot token.
        throw new NotificationError('network', true)
      }
    },
  }
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createTelegramSender,
  NotificationError,
} from '../src/services/telegram.js'

const settings = {
  TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz_123456789',
  TELEGRAM_ADMIN_CHAT_ID: '123456789',
  PUBLIC_SITE_URL: 'https://shop.example.test',
}
const event = {
  id: 'prod_one',
  name: '<img src=x> *item*',
  price: 12,
  ownerId: 'user_one',
  createdAt: '2026-11-02T10:00:00.000Z',
}
test('Telegram sends plain text to the configured private chat with trusted moderation links', async () => {
  let body: Record<string, unknown> = {}
  const sender = createTelegramSender(settings, async (url, init) => {
    assert.equal(
      url,
      `https://api.telegram.org/bot${settings.TELEGRAM_BOT_TOKEN}/sendMessage`
    )
    assert.equal(init?.method, 'POST')
    assert.ok(init?.signal)
    body = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({ ok: true, result: { message_id: 42 } })
    )
  })!
  const payload = sender.prepare(event)
  assert.equal(payload.chatId, '123456789')
  assert.match(payload.text, /<img src=x> \*item\*/)
  assert.match(payload.text, /12\.00/)
  assert.match(payload.text, /user_one/)
  assert.equal(
    JSON.stringify(payload).includes(settings.TELEGRAM_BOT_TOKEN),
    false
  )
  assert.deepEqual(await sender.send(payload), { messageId: '42' })
  assert.equal(body.chat_id, '123456789')
  assert.equal(body.parse_mode, undefined)
  assert.equal(body.allow_paid_broadcast, false)
  assert.deepEqual(body.reply_markup, {
    inline_keyboard: [
      [
        {
          text: 'View product',
          url: 'https://shop.example.test/product/prod_one',
        },
        {
          text: 'Admin panel',
          url: 'https://shop.example.test/admin/products',
        },
      ],
    ],
  })
  const long = sender.prepare({
    ...event,
    name: '😀'.repeat(5000),
    ownerId: 'x'.repeat(5000),
  })
  assert.ok(long.text.length <= 4096)
  assert.equal(long.productUrl, payload.productUrl)
})

test('Telegram disables sending with missing or invalid settings, including non-private recipients', () => {
  assert.equal(createTelegramSender({}), undefined)
  for (const override of [
    { TELEGRAM_BOT_TOKEN: 'bad' },
    { TELEGRAM_ADMIN_CHAT_ID: '-1001234' },
    { TELEGRAM_ADMIN_CHAT_ID: '@somebody' },
    { TELEGRAM_ADMIN_CHAT_ID: '0' },
    { PUBLIC_SITE_URL: 'javascript:alert(1)' },
    { PUBLIC_SITE_URL: 'https://user:password@shop.example.test' },
    { PUBLIC_SITE_URL: 'https://shop.example.test/path' },
  ])
    assert.equal(createTelegramSender({ ...settings, ...override }), undefined)
})

test('Telegram recognizes API errors even with HTTP 200, honors retry_after and sanitizes failures', async () => {
  for (const [status, errorCode, retryable, code] of [
    [429, 429, true, 'rate_limit'],
    [200, 429, true, 'rate_limit'],
    [503, 503, true, 'provider_unavailable'],
    [403, 403, false, 'provider_rejected'],
    [200, 400, false, 'provider_rejected'],
  ] as const) {
    const sender = createTelegramSender(
      settings,
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error_code: errorCode,
            description: 'secret provider details',
            parameters: { retry_after: 120 },
          }),
          { status }
        )
    )!
    await assert.rejects(sender.send(sender.prepare(event)), error => {
      assert.ok(error instanceof NotificationError)
      assert.equal(error.retryable, retryable)
      assert.equal(error.code, code)
      assert.equal(error.retryAfterMs, 120000)
      assert.doesNotMatch(error.message, /secret|123456/)
      return true
    })
  }
})

test('Telegram never marks invalid responses as sent and hides token-bearing network failures', async () => {
  for (const response of [
    new Response('gateway down', { status: 502 }),
    new Response('not json'),
    new Response(JSON.stringify({ ok: true, result: {} })),
    new Response(JSON.stringify({ ok: true, result: { message_id: 0 } })),
  ]) {
    const sender = createTelegramSender(settings, async () => response)!
    await assert.rejects(sender.send(sender.prepare(event)), {
      retryable: true,
    })
  }
  const sender = createTelegramSender(settings, async () => {
    throw new Error(
      'https://api.telegram.org/bot' + settings.TELEGRAM_BOT_TOKEN
    )
  })!
  await assert.rejects(sender.send(sender.prepare(event)), error => {
    assert.ok(error instanceof NotificationError)
    assert.equal(error.code, 'network')
    assert.equal(
      JSON.stringify(error).includes(settings.TELEGRAM_BOT_TOKEN),
      false
    )
    assert.equal(error.message.includes(settings.TELEGRAM_BOT_TOKEN), false)
    return true
  })
})

test(
  'Telegram bounds a stalled request with a ten-second timeout',
  { timeout: 15000 },
  async () => {
    const sender = createTelegramSender(
      settings,
      async (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener(
            'abort',
            () => reject(init!.signal!.reason),
            { once: true }
          )
        })
    )!
    const keepAlive = setTimeout(() => {}, 14000)
    const start = Date.now()
    try {
      await assert.rejects(sender.send(sender.prepare(event)), {
        code: 'network',
        retryable: true,
      })
      assert.ok(Date.now() - start < 13000)
    } finally {
      clearTimeout(keepAlive)
    }
  }
)

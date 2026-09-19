import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { MockLanguageModelV3 } from 'ai/test'
import { simulateReadableStream } from 'ai'
import { createApp } from '../src/app.js'
import { parseEnv } from '../src/config/env.js'
const config = parseEnv({
  AIRTABLE_API_KEY: 'test',
  AIRTABLE_BASE_ID: 'base',
  AIRTABLE_TABLE_NAME: 'table',
})
const product = {
  id: 'rec1',
  name: 'Phone',
  description: '',
  category: 'phones',
  price: 125,
  images: [],
  image: '',
}
const body = {
  messages: [
    {
      id: 'm1',
      role: 'user',
      parts: [{ type: 'text', text: 'Price?' }],
      metadata: { productId: 'rec1', product: { price: 1 } },
    },
  ],
}
for (const fails of [false, true]) {
  test(
    fails
      ? 'stream errors stay safe and preserve the UI protocol'
      : 'chat streams UI messages with authoritative product data',
    async () => {
      const model = new MockLanguageModelV3({
        doStream: async options => {
          const prompt = JSON.stringify(options.prompt)
          assert.ok(prompt.includes('125'))
          if (fails) throw new Error('provider-secret')
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: 'text-start' as const, id: 'text-1' },
                {
                  type: 'text-delta' as const,
                  id: 'text-1',
                  delta: 'The price is 125.',
                },
                { type: 'text-end' as const, id: 'text-1' },
                {
                  type: 'finish' as const,
                  finishReason: { unified: 'stop' as const, raw: undefined },
                  usage: {
                    inputTokens: {
                      total: 3,
                      noCache: 3,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: { total: 5, text: 5, reasoning: undefined },
                  },
                },
              ],
            }),
          }
        },
      })
      const server = createApp({
        config,
        model,
        products: {
          list: async () => [product],
          get: async id => {
            assert.equal(id, 'rec1')
            return product
          },
        },
      }).listen(0, '127.0.0.1')
      await once(server, 'listening')
      const url =
        'http://127.0.0.1:' +
        (server.address() as import('node:net').AddressInfo).port
      try {
        const response = await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        assert.equal(response.status, 200)
        assert.match(
          response.headers.get('content-type')!,
          /text\/event-stream/
        )
        assert.equal(
          response.headers.get('x-vercel-ai-ui-message-stream'),
          'v1'
        )
        const text = await response.text()
        assert.ok(text.includes('[DONE]'))
        assert.ok(
          text.includes(fails ? 'temporarily unavailable' : 'The price is 125.')
        )
        assert.ok(!text.includes('provider-secret'))
        const invalid = await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ ...body.messages[0], role: 'system' }],
          }),
        })
        assert.equal(invalid.status, 400)
      } finally {
        server.closeAllConnections()
        await new Promise<void>(resolve => server.close(() => resolve()))
      }
    }
  )
}

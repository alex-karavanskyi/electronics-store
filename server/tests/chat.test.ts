import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter, once } from 'node:events'
import express, { type ErrorRequestHandler } from 'express'
import { MockLanguageModelV4 } from 'ai/test'
import { simulateReadableStream } from 'ai'
import { createApp } from '../src/app.js'
import { parseEnv } from '../src/config/env.js'
import { HttpError } from '../src/middleware/errors.js'
import type { ChatAdmission } from '../src/services/chat-admission.js'
const config = parseEnv({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
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

function createModel(fails = false) {
  return new MockLanguageModelV4({
    doStream: async options => {
      assert.equal(options.maxOutputTokens, 2048)
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
}

for (const fails of [false, true]) {
  test(
    fails
      ? 'stream errors stay safe and preserve the UI protocol'
      : 'chat streams UI messages with authoritative product data',
    async () => {
      const server = createApp({
        config,
        chatAdmission: { acquire: async () => ({ release: async () => {} }) },
        model: createModel(fails),
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

test('chat forwards response write failures to Express error handling', async t => {
  const writeError = new Error('response-write-failure')
  const errorEvents = new EventEmitter()
  const app = express()
  app.use((_req, res, next) => {
    t.mock.method(res, 'write', () => {
      throw writeError
    })
    next()
  })
  app.use(
    createApp({
      config,
      chatAdmission: { acquire: async () => ({ release: async () => {} }) },
      model: createModel(),
      products: {
        list: async () => [product],
        get: async () => product,
      },
    })
  )
  const captureError: ErrorRequestHandler = (error, _req, _res, _next) => {
    errorEvents.emit('handled', error)
  }
  app.use(captureError)

  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port
  try {
    const errorReceived = once(errorEvents, 'handled', {
      signal: AbortSignal.timeout(5000),
    })
    const [response, [receivedError]] = await Promise.all([
      fetch(url + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      errorReceived,
    ])
    await response.text()
    assert.equal(receivedError, writeError)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

async function withChat(
  options: Partial<Parameters<typeof createApp>[0]>,
  run: (url: string) => Promise<void>
) {
  const server = createApp({
    config,
    products: { list: async () => [product], get: async () => product },
    model: createModel(),
    chatAdmission: { acquire: async () => ({ release: async () => {} }) },
    ...options,
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    await run(
      'http://127.0.0.1:' +
        (server.address() as import('node:net').AddressInfo).port
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}
const postChat = (url: string, payload: unknown = body, signal?: AbortSignal) =>
  fetch(url + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

test('the route deadline aborts a stalled generation and releases its shared slot', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const events = new EventEmitter()
  const model = new MockLanguageModelV4({
    doStream: async options => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-start', id: 'held' })
          controller.enqueue({ type: 'text-delta', id: 'held', delta: 'Hello' })
          options.abortSignal?.addEventListener(
            'abort',
            () => {
              events.emit('aborted')
              controller.close()
            },
            { once: true }
          )
        },
      }),
    }),
  })
  await withChat(
    {
      model,
      chatAdmission: {
        acquire: async () => ({
          release: async () => {
            events.emit('released')
          },
        }),
      },
    },
    async url => {
      const response = await postChat(url)
      const reader = response.body!.getReader()
      await reader.read()
      const aborted = once(events, 'aborted', {
        signal: AbortSignal.timeout(5000),
      })
      const released = once(events, 'released', {
        signal: AbortSignal.timeout(5000),
      })
      t.mock.timers.tick(120_000)
      await Promise.all([aborted, released])
      await reader.cancel()
    }
  )
})

test('quota exhaustion returns 429 and Retry-After before product lookup or provider invocation', async () => {
  let reads = 0
  await withChat(
    {
      products: {
        list: async () => [],
        get: async () => {
          reads++
          return product
        },
      },
      chatAdmission: { acquire: async () => null },
    },
    async url => {
      const response = await postChat(url)
      assert.equal(response.status, 429)
      assert.equal(response.headers.get('Retry-After'), '60')
      assert.equal(response.headers.get('Cache-Control'), 'no-store')
      assert.equal(reads, 0)
    }
  )
})

test('missing admission and unavailable quota storage fail closed', async () => {
  for (const chatAdmission of [
    undefined,
    {
      acquire: async () => {
        throw new HttpError(503, 'Product assistant is temporarily unavailable')
      },
    },
  ]) {
    let reads = 0
    await withChat(
      {
        chatAdmission,
        products: {
          list: async () => [],
          get: async () => {
            reads++
            return product
          },
        },
      },
      async url => {
        assert.equal((await postChat(url)).status, 503)
        assert.equal(reads, 0)
      }
    )
  }
})

test('combined text and reasoning history is capped before admission, including multiple messages', async () => {
  let admissions = 0
  await withChat(
    {
      chatAdmission: {
        acquire: async () => {
          admissions++
          return { release: async () => {} }
        },
      },
    },
    async url => {
      const response = await postChat(url, {
        messages: [
          {
            ...body.messages[0],
            id: 'previous',
            role: 'assistant',
            parts: [{ type: 'reasoning', text: 'x'.repeat(6000) }],
          },
          {
            ...body.messages[0],
            parts: [{ type: 'text', text: 'y'.repeat(6001) }],
          },
        ],
      })
      assert.equal(response.status, 413)
      assert.equal(admissions, 0)
      const valid = await postChat(url, {
        messages: [
          {
            ...body.messages[0],
            parts: [{ type: 'text', text: 'z'.repeat(12000) }],
          },
        ],
      })
      assert.equal(valid.status, 200)
      await valid.text()
      assert.equal(admissions, 1)
    }
  )
})

test('product instructions exclude image payloads and cap oversized imported descriptions', async () => {
  let prompt = ''
  const model = new MockLanguageModelV4({
    doStream: async options => {
      prompt = JSON.stringify(options.prompt)
      return { stream: simulateReadableStream({ chunks: [] }) }
    },
  })
  await withChat(
    {
      model,
      products: {
        list: async () => [],
        get: async () => ({
          ...product,
          description: 'd'.repeat(10000),
          images: ['data:image/png;base64,PRIVATE_IMAGE'],
          image: 'data:image/png;base64,PRIVATE_IMAGE',
        }),
      },
    },
    async url => {
      await (await postChat(url)).text()
    }
  )
  assert.ok(prompt.includes('125'))
  assert.ok(!prompt.includes('PRIVATE_IMAGE'))
  assert.ok(!prompt.includes('d'.repeat(6001)))
  assert.ok(prompt.length < 8000)
})

test('a product lookup error releases admission without hiding the original HTTP error', async () => {
  let releases = 0
  await withChat(
    {
      products: {
        list: async () => [],
        get: async () => {
          throw new HttpError(404, 'Product not found')
        },
      },
      chatAdmission: {
        acquire: async () => ({
          release: async () => {
            releases++
          },
        }),
      },
    },
    async url => {
      assert.equal((await postChat(url)).status, 404)
      assert.equal(releases, 1)
    }
  )
})

test('streaming holds the lease until disconnect, then aborts the provider and releases once', async () => {
  const events = new EventEmitter()
  let releases = 0
  const admission: ChatAdmission = {
    acquire: async () => ({
      release: async () => {
        releases++
        events.emit('released')
      },
    }),
  }
  const model = new MockLanguageModelV4({
    doStream: async options => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-start', id: 'held' })
          controller.enqueue({ type: 'text-delta', id: 'held', delta: 'Hello' })
          options.abortSignal?.addEventListener(
            'abort',
            () => {
              events.emit('aborted')
              controller.close()
            },
            { once: true }
          )
        },
      }),
    }),
  })
  await withChat({ model, chatAdmission: admission }, async url => {
    const disconnect = new AbortController()
    const response = await postChat(url, body, disconnect.signal)
    const reader = response.body!.getReader()
    await reader.read()
    assert.equal(releases, 0)
    const aborted = once(events, 'aborted', {
      signal: AbortSignal.timeout(5000),
    })
    const released = once(events, 'released', {
      signal: AbortSignal.timeout(5000),
    })
    disconnect.abort()
    await Promise.all([aborted, released])
    assert.equal(releases, 1)
    await reader.cancel().catch(() => {})
  })
})

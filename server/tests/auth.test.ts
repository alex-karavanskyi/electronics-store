import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import express from 'express'
import { createApp } from '../src/app.js'
import { parseEnv } from '../src/config/env.js'
import * as authMiddleware from '../src/middleware/auth.js'
import { errorHandler } from '../src/middleware/errors.js'

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const publishableKey =
  'pk_test_' + Buffer.from('clerk.example.test$').toString('base64')
const env = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  CLERK_PUBLISHABLE_KEY: publishableKey,
  CLERK_SECRET_KEY: 'sk_test_local_fixture_only',
  CLERK_JWT_KEY: keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString(),
}
const products = {
  list: async () => [],
  get: async () => {
    throw new Error('Unused')
  },
}

async function readError(response: Response) {
  const body: unknown = await response.json()
  assert.ok(body && typeof body === 'object' && 'error' in body)
  assert.equal(typeof body.error, 'string')
  return body
}

function token(claims: Record<string, unknown> = {}, forged = false) {
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const body =
    encode({ alg: 'RS256', typ: 'JWT', kid: 'local-test' }) +
    '.' +
    encode({
      iss: 'https://clerk.example.test',
      sub: 'user_one',
      sid: 'sess_one',
      azp: 'http://localhost:5173',
      iat: now,
      nbf: now - 10,
      exp: now + 60,
      v: 2,
      sts: 'active',
      fva: [0, -1],
      ...claims,
    })
  return (
    body +
    '.' +
    sign(
      'RSA-SHA256',
      Buffer.from(body),
      forged ? otherKeys.privateKey : keys.privateKey
    ).toString('base64url')
  )
}

async function withApp(run: (url: string) => Promise<void>, configured = true) {
  const app = createApp({
    config: parseEnv(configured ? env : { MONGODB_URI: env.MONGODB_URI }),
    products,
    serveClient: false,
  })
  const server = app.listen(0, '127.0.0.1')
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

test('public products stay available without Clerk; private session fails closed', async () => {
  await withApp(async url => {
    assert.equal((await fetch(url + '/api/products')).status, 200)
    const response = await fetch(url + '/api/me')
    assert.equal(response.status, 503)
    assert.match(response.headers.get('cache-control')!, /no-store/)
  }, false)
})

test('a guest gets JSON 401, not a redirect, while public products stay accessible', async () => {
  await withApp(async url => {
    assert.equal((await fetch(url + '/api/products')).status, 200)
    const response = await fetch(url + '/api/me', { redirect: 'manual' })
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('location'), null)
    await readError(response)
  })
})

test('session identity and role come only from the verified token', async () => {
  await withApp(async url => {
    for (const [claims, role] of [
      [{}, 'user'],
      [{ role: 'admin' }, 'admin'],
      [{ role: 'owner' }, 'user'],
    ] as const) {
      const response = await fetch(
        url + '/api/me?userId=user_other&role=admin',
        {
          headers: {
            Authorization: 'Bearer ' + token(claims),
            'X-User-Id': 'user_other',
            'X-Role': 'admin',
          },
        }
      )
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { userId: 'user_one', role })
      assert.match(response.headers.get('cache-control')!, /private.*no-store/)
    }
  })
})

test('invalid signatures, expiry, future tokens, wrong origin and pending sessions cannot authenticate', async () => {
  await withApp(async url => {
    const now = Math.floor(Date.now() / 1000)
    for (const invalid of [
      'not-a-jwt',
      token({ role: 'admin' }, true),
      token({ exp: now - 120 }),
      token({ nbf: now + 120 }),
      token({ azp: 'https://untrusted.example' }),
      token({ sts: 'pending' }),
    ]) {
      const response = await fetch(url + '/api/me', {
        headers: { Authorization: 'Bearer ' + invalid },
        redirect: 'manual',
      })
      assert.equal(response.status, 401)
      const body = await readError(response)
      assert.ok(!JSON.stringify(body).includes(invalid))
    }
  })
})

test('CORS permits bearer authorization and future CRUD preflights from trusted origins', async () => {
  await withApp(async url => {
    const response = await fetch(url + '/api/products/one', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    })
    assert.equal(response.status, 204)
    assert.match(
      response.headers.get('access-control-allow-headers')!,
      /Authorization/i
    )
    assert.match(response.headers.get('access-control-allow-methods')!, /PATCH/)
    assert.match(
      response.headers.get('access-control-allow-methods')!,
      /DELETE/
    )
  })
})

test('Clerk configuration rejects partial setup without disclosing keys', () => {
  for (const partial of [
    { CLERK_PUBLISHABLE_KEY: publishableKey },
    { CLERK_SECRET_KEY: env.CLERK_SECRET_KEY },
    {
      CLERK_PUBLISHABLE_KEY: 'invalid-private-value',
      CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
    },
  ]) {
    assert.throws(
      () => parseEnv({ MONGODB_URI: env.MONGODB_URI, ...partial }),
      error =>
        error instanceof Error &&
        error.message.includes('CLERK_') &&
        !error.message.includes('local_fixture') &&
        !error.message.includes('invalid-private-value')
    )
  }
})

test('admin guard rejects guests and ordinary users, and permits verified admins', async () => {
  const app = express()
  app.use(authMiddleware.createAuthMiddleware(parseEnv(env)))
  app.post('/write', authMiddleware.requireAdmin, (_req, res) =>
    res.status(204).end()
  )
  app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const url =
      'http://127.0.0.1:' +
      (server.address() as import('node:net').AddressInfo).port +
      '/write'
    for (const [bearer, expected] of [
      ['', 401],
      [token(), 403],
      [token({ role: 'owner' }), 403],
      [token({ role: 'admin' }, true), 401],
      [token({ role: 'admin' }), 204],
    ] as const) {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin', userId: 'user_admin' }),
      })
      assert.equal(response.status, expected)
      assert.match(response.headers.get('cache-control')!, /no-store/)
      if (expected !== 204) await readError(response)
    }
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

import { generateKeyPairSync, sign } from 'node:crypto'
import { parseEnv } from '../../src/config/env.js'

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
export const authConfig = parseEnv({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  CLERK_PUBLISHABLE_KEY:
    'pk_test_' + Buffer.from('clerk.example.test$').toString('base64'),
  CLERK_SECRET_KEY: 'sk_test_local_fixture_only',
  CLERK_JWT_KEY: keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString(),
})

export function sessionToken(userId = 'user_one', claims = {}) {
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const body =
    encode({ alg: 'RS256', typ: 'JWT', kid: 'local-test' }) +
    '.' +
    encode({
      iss: 'https://clerk.example.test',
      sub: userId,
      sid: 'sess_' + userId,
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
    sign('RSA-SHA256', Buffer.from(body), keys.privateKey).toString('base64url')
  )
}

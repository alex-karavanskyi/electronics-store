import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { parseEnv } from '../config/env.js'
import {
  connectDatabase,
  database,
  disconnectDatabase,
} from '../config/database.js'
import { prepareProductIndexes } from '../models/product.js'

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })
try {
  const config = parseEnv(process.env)
  await connectDatabase(config.MONGODB_URI)
  // Creates only the ownership index. No document writes or destructive syncIndexes.
  await prepareProductIndexes(database)
  console.log('Product ownership index is ready')
} catch {
  console.error(
    'Product setup failed; check database configuration and permissions'
  )
  process.exitCode = 1
} finally {
  await disconnectDatabase()
}

import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { parseEnv } from '../config/env.js'
import {
  connectDatabase,
  database,
  disconnectDatabase,
} from '../config/database.js'
import { getFavoritesModel } from '../models/favorites.js'

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })
try {
  const config = parseEnv(process.env)
  await connectDatabase(config.MONGODB_URI)
  // No product writes or destructive index synchronization. MongoDB supplies
  // the unique _id index; the Clerk user ID is the document's primary key.
  await getFavoritesModel(database).createCollection()
  console.log('Favorites collection is ready')
} catch {
  console.error(
    'Favorites setup failed; check database configuration and permissions'
  )
  process.exitCode = 1
} finally {
  await disconnectDatabase()
}

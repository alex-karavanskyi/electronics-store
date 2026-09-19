import { z } from 'zod'
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
  AIRTABLE_API_KEY: z.string().trim().min(1),
  AIRTABLE_BASE_ID: z.string().trim().min(1),
  AIRTABLE_TABLE_NAME: z.string().trim().min(1),
  OPENAI_API_KEY: z.string().trim().optional(),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
    )
    .transform(value => value.split(',').map(origin => origin.trim()))
    .refine(
      origins =>
        origins.length > 0 &&
        origins.every(origin => {
          try {
            const url = new URL(origin)
            return (
              ['http:', 'https:'].includes(url.protocol) &&
              url.origin === origin
            )
          } catch {
            return false
          }
        })
    ),
})
export function parseEnv(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env)
  if (!result.success)
    throw new Error(
      'Invalid environment variables: ' +
        [
          ...new Set(result.error.issues.map(issue => issue.path.join('.'))),
        ].join(', ')
    )
  return result.data
}
export type Config = ReturnType<typeof parseEnv>

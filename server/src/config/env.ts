import { z } from 'zod'

const optionalSetting = (schema: z.ZodString) =>
  z.preprocess(
    value => (typeof value === 'string' && !value.trim() ? undefined : value),
    schema.trim().optional()
  )

const schema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    HOST: z.string().min(1).default('127.0.0.1'),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    OPENAI_API_KEY: z.string().trim().optional(),
    PRODUCT_NOTIFICATIONS_CRON_SECRET: optionalSetting(z.string().min(32)),
    // Invalid/incomplete Telegram configuration disables sending, not publication.
    TELEGRAM_BOT_TOKEN: z.string().trim().optional(),
    TELEGRAM_ADMIN_CHAT_ID: z.string().trim().optional(),
    PUBLIC_SITE_URL: z.string().trim().optional(),
    CLERK_PUBLISHABLE_KEY: optionalSetting(
      z.string().regex(/^pk_(test|live)_[A-Za-z0-9+/=_-]+$/)
    ),
    CLERK_SECRET_KEY: optionalSetting(z.string().regex(/^sk_(test|live)_\S+$/)),
    CLERK_JWT_KEY: optionalSetting(z.string().min(1)),
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
  .superRefine((config, context) => {
    if (
      Boolean(config.CLERK_PUBLISHABLE_KEY) !== Boolean(config.CLERK_SECRET_KEY)
    ) {
      context.addIssue({
        code: 'custom',
        path: [
          config.CLERK_PUBLISHABLE_KEY
            ? 'CLERK_SECRET_KEY'
            : 'CLERK_PUBLISHABLE_KEY',
        ],
        message: 'Configure both Clerk keys or neither',
      })
    }
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

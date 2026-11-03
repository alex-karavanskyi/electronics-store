export const clientEnv = {
  dev: import.meta.env.DEV,
  apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''),
  clerkPublishableKey: (
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
  ).trim(),
}

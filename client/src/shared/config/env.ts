export const clientEnv = {
  dev: import.meta.env.DEV,
  apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''),
}

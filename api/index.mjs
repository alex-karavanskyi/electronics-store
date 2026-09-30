export { default } from '../server/dist/vercel.js'

// Express owns JSON parsing, size limits and the streaming chat response.
export const config = { api: { bodyParser: false } }

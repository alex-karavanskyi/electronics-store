import type { ErrorRequestHandler } from 'express'
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    next(error)
    return
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  const type =
    typeof error === 'object' && error !== null && 'type' in error
      ? error.type
      : undefined
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large' })
    return
  }
  if (error instanceof URIError) {
    res.status(400).json({ error: 'Invalid URL encoding' })
    return
  }
  // Never return or log upstream responses, authorization headers or request bodies.
  console.error('Unhandled API error')
  res.status(500).json({ error: 'Internal server error' })
}

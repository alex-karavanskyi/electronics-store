import type { z } from 'zod'
import { clientEnv } from '@/shared/config/env'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiUrl = (path: string) => `${clientEnv.apiUrl}/api${path}`

function getErrorMessage(body: unknown, status: number): string {
  if (
    body !== null &&
    typeof body === 'object' &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error
  }

  return `Request failed (${status})`
}

export async function fetchJson<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  token?: string,
  request?: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    signal,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    ...(request
      ? {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(request.body === undefined
            ? {}
            : { body: JSON.stringify(request.body) }),
        }
      : {}),
  })

  if (response.status === 204 && response.ok) {
    const empty = schema.safeParse(undefined)
    if (!empty.success)
      throw new ApiError(204, 'Invalid API response', empty.error)
    return empty.data
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    // Preserve cancellation and network failures for every HTTP status.
    if (!(cause instanceof SyntaxError)) throw cause

    const message = response.ok
      ? 'Invalid API response'
      : getErrorMessage(null, response.status)
    throw new ApiError(response.status, message, cause)
  }

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(body, response.status))
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError(response.status, 'Invalid API response', result.error)
  }

  return result.data
}

export async function fetchAuthenticatedJson<T>(
  path: string,
  schema: z.ZodType<T>,
  getToken: () => Promise<string | null>,
  signal?: AbortSignal,
  request?: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }
): Promise<T> {
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
  const token = await getToken()
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
  if (!token) throw new ApiError(401, 'Sign in to continue')
  return fetchJson(path, schema, signal, token, request)
}

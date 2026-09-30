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
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(apiUrl(path), { signal })

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

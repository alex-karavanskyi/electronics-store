import type { z } from 'zod'
import { clientEnv } from '@/shared/config/env'
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export const apiUrl = (path: string) => clientEnv.apiUrl + '/api' + path
export async function fetchJson<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(apiUrl(path), { signal })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'Request failed (' + response.status + ')'
    throw new ApiError(response.status, message)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    // Preserve cancellation and network failures.
    if (error instanceof SyntaxError)
      throw new ApiError(response.status, 'Invalid API response')
    throw error
  }
  const result = schema.safeParse(body)
  if (!result.success)
    throw new ApiError(response.status, 'Invalid API response')
  return result.data
}

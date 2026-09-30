import { z } from 'zod'
import { mockFetch, jsonResponse } from '../support/fetch'
import { fetchJson } from '@/shared/api/http'

const schema = z.object({ price: z.number() })

beforeEach(() => mockFetch.mockReset())

it.each([
  [200, 'Invalid API response'],
  [502, 'Request failed (502)'],
])(
  'preserves the JSON parsing error for status %s',
  async (status, message) => {
    const cause = new SyntaxError('Unexpected token <')
    mockFetch.mockResolvedValue({
      ok: status === 200,
      status,
      json: async () => {
        throw cause
      },
    } as unknown as Response)

    await expect(fetchJson('/products/phone', schema)).rejects.toMatchObject({
      name: 'ApiError',
      status,
      message,
      cause,
    })
  }
)

it('preserves validation issues for diagnosing an invalid response', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ price: '125' }))

  await expect(fetchJson('/products/phone', schema)).rejects.toMatchObject({
    name: 'ApiError',
    status: 200,
    message: 'Invalid API response',
    cause: {
      name: 'ZodError',
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ['price'], code: 'invalid_type' }),
      ]),
    },
  })
})

it.each([null, {}, { error: 123 }])(
  'uses a fallback message when the error body has no string error: %j',
  async body => {
    mockFetch.mockResolvedValue(jsonResponse(body, 503))

    await expect(fetchJson('/products/phone', schema)).rejects.toMatchObject({
      status: 503,
      message: 'Request failed (503)',
    })
  }
)

describe.each([200, 503])('when reading a response with status %s', status => {
  it.each([
    ['cancellation', new DOMException('Aborted', 'AbortError')],
    ['network failure', new TypeError('Network connection lost')],
  ])('preserves the original %s', async (_label, cause) => {
    mockFetch.mockResolvedValue({
      ok: status === 200,
      status,
      json: async () => {
        throw cause
      },
    } as unknown as Response)

    await expect(fetchJson('/products/phone', schema)).rejects.toBe(cause)
  })
})

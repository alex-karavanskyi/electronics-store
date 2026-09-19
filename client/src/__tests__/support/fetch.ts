export const jsonResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }) as Response
export const mockFetch = jest.fn<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>()
globalThis.fetch = mockFetch

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'

import { useProducts, useProduct } from '@/shared/hooks/useProducts'
import { createQueryClient } from '@/shared/lib/queryClient'

jest.mock('axios')
const get = jest.mocked(axios.get)

const setup = () => {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}

beforeEach(() => jest.clearAllMocks())

it('shares a catalog request and reuses fresh data across mounts', async () => {
  get.mockResolvedValue({ data: [{ id: 'one' }] })
  const { wrapper, client } = setup()
  const first = renderHook(() => [useProducts(), useProducts()], { wrapper })
  await waitFor(() =>
    expect(first.result.current[0].data).toEqual([{ id: 'one' }])
  )
  expect(first.result.current[1].data).toEqual([{ id: 'one' }])
  first.unmount()
  const second = renderHook(() => useProducts(), { wrapper })
  expect(second.result.current.data).toEqual([{ id: 'one' }])
  expect(get).toHaveBeenCalledTimes(1)
  second.unmount()
  client.clear()
})

it('exposes a failed request and allows a successful retry', async () => {
  get
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: [] })
  const { wrapper, client } = setup()
  const { result, unmount } = renderHook(() => useProducts(), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error?.message).toBe('offline')
  await act(async () => {
    await result.current.refetch()
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([])
  unmount()
  client.clear()
})

it('keeps detail results separate and cancels an abandoned ID request', async () => {
  let resolveOld!: (value: unknown) => void
  get
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve
        })
    )
    .mockResolvedValueOnce({ data: { id: 'two' } })
  const { wrapper, client } = setup()
  const { result, rerender, unmount } = renderHook(({ id }) => useProduct(id), {
    initialProps: { id: 'one' },
    wrapper,
  })
  const signal = get.mock.calls[0][1]?.signal
  rerender({ id: 'two' })
  expect(signal?.aborted).toBe(true)
  await waitFor(() => expect(result.current.data).toEqual({ id: 'two' }))
  await act(async () => {
    resolveOld({ data: { id: 'one' } })
  })
  expect(result.current.data).toEqual({ id: 'two' })
  expect(get.mock.calls[1][0]).toBe('/api/two')
  unmount()
  client.clear()
})

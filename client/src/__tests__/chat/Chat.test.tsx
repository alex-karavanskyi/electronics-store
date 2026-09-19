import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockFetch } from '../support/fetch'
import '../support/streams'
import Chat from '@/components/chat/Chat'

const product = {
  id: 'phone',
  name: 'Phone',
  description: '',
  category: 'phones',
  price: 125,
  image: '',
  images: [],
}

beforeEach(() => {
  mockFetch.mockReset()
  HTMLElement.prototype.scrollIntoView = jest.fn()
})

it('aborts the pending chat request when the chat unmounts', async () => {
  let signal: AbortSignal | null | undefined
  let finishRequest: (() => void) | undefined
  mockFetch.mockImplementation((_url, options) => {
    signal = options?.signal
    return new Promise((_resolve, reject) => {
      finishRequest = () => reject(new DOMException('Aborted', 'AbortError'))
      signal?.addEventListener('abort', finishRequest, { once: true })
    })
  })

  const { unmount } = render(<Chat product={product} />)
  const input = screen.getByPlaceholderText('Your question...')
  fireEvent.change(input, { target: { value: 'What is the price?' } })
  fireEvent.submit(input.closest('form')!)

  await waitFor(() => expect(signal).toBeDefined())
  expect(signal?.aborted).toBe(false)

  // A normal render while the request is active must not cancel it.
  fireEvent.change(input, { target: { value: 'Another question' } })
  expect(signal?.aborted).toBe(false)

  try {
    unmount()
    expect(signal?.aborted).toBe(true)
  } finally {
    finishRequest?.()
  }
})

it('aborts an active response stream when the chat unmounts', async () => {
  let signal: AbortSignal | null | undefined
  let finishStream: (() => void) | undefined
  mockFetch.mockImplementation(async (_url, options) => {
    signal = options?.signal
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const chunks = [
          { type: 'start', messageId: 'reply' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'The price is' },
        ]
        controller.enqueue(
          new TextEncoder().encode(
            chunks
              .map(chunk => 'data: ' + JSON.stringify(chunk) + '\n\n')
              .join('')
          )
        )
        finishStream = () => {
          finishStream = undefined
          controller.close()
        }
        signal?.addEventListener('abort', finishStream, { once: true })
      },
    })
    return { ok: true, status: 200, body } as Response
  })

  const { unmount } = render(<Chat product={product} />)
  const input = screen.getByPlaceholderText('Your question...')
  fireEvent.change(input, { target: { value: 'Price?' } })
  fireEvent.submit(input.closest('form')!)

  try {
    expect(await screen.findByText('The price is')).toBeVisible()
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  } finally {
    finishStream?.()
  }
})

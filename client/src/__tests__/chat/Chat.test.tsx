import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  const { unmount } = render(<Chat productId={product.id} />)
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

  const { unmount } = render(<Chat productId={product.id} />)
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

it('disables the form without a product and rejects blank questions', () => {
  const { rerender } = render(<Chat productId={null} />)
  const input = screen.getByRole('textbox', { name: 'Your question' })
  const button = screen.getByRole('button', { name: 'Send question' })

  expect(
    screen.getByText('Hi! 👋 Ask a question about the product')
  ).toBeVisible()
  expect(input).toBeDisabled()
  expect(button).toBeDisabled()
  fireEvent.submit(input.closest('form')!)
  expect(mockFetch).not.toHaveBeenCalled()

  rerender(<Chat productId={product.id} />)
  expect(input).toBeEnabled()
  expect(button).toBeDisabled()
  fireEvent.change(input, { target: { value: '   ' } })
  fireEvent.submit(input.closest('form')!)
  expect(button).toBeDisabled()
  expect(mockFetch).not.toHaveBeenCalled()
})

it('sends product metadata and shows one cursor until the response finishes', async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  let respond!: (response: Response) => void
  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController
    },
  })
  mockFetch.mockImplementation(
    () =>
      new Promise(resolve => {
        respond = resolve
      })
  )

  const { container } = render(<Chat productId={product.id} />)
  const input = screen.getByRole('textbox', { name: 'Your question' })
  const button = screen.getByRole('button', { name: 'Send question' })
  fireEvent.change(input, { target: { value: 'Price?' } })
  expect(button).toBeEnabled()
  fireEvent.submit(input.closest('form')!)

  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  const request = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
  expect(request.messages[0]).toMatchObject({
    role: 'user',
    metadata: { productId: product.id },
    parts: [{ type: 'text', text: 'Price?' }],
  })
  expect(input).toHaveValue('')
  expect(container.querySelectorAll('.cursor')).toHaveLength(1)
  expect(button).toBeDisabled()

  fireEvent.change(input, { target: { value: 'Another question' } })
  fireEvent.submit(input.closest('form')!)
  expect(mockFetch).toHaveBeenCalledTimes(1)

  await act(async () => {
    respond({ ok: true, status: 200, body } as Response)
    const chunks = [
      { type: 'start', messageId: 'reply' },
      { type: 'text-start', id: 'text' },
      { type: 'text-delta', id: 'text', delta: 'The price is $125' },
    ]
    controller.enqueue(
      new TextEncoder().encode(
        chunks.map(chunk => 'data: ' + JSON.stringify(chunk) + '\n\n').join('')
      )
    )
  })

  expect(await screen.findByText('The price is $125')).toBeVisible()
  expect(container.querySelectorAll('.cursor')).toHaveLength(1)
  expect(
    screen
      .getByText('The price is $125')
      .parentElement?.querySelector('.cursor')
  ).not.toBeNull()
  expect(button).toBeDisabled()
  fireEvent.submit(input.closest('form')!)
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: 'smooth',
  })

  await act(async () => {
    controller.enqueue(
      new TextEncoder().encode(
        'data: {"type":"text-end","id":"text"}\n\n' +
          'data: {"type":"finish"}\n\n' +
          'data: [DONE]\n\n'
      )
    )
    controller.close()
  })
  await waitFor(() => expect(button).toBeEnabled())
  expect(container.querySelector('.cursor')).toBeNull()
  expect(input).toHaveValue('Another question')
})

it('shows a request error and allows another question', async () => {
  mockFetch.mockRejectedValue(new Error('Network unavailable'))
  render(<Chat productId={product.id} />)
  const input = screen.getByRole('textbox', { name: 'Your question' })
  fireEvent.change(input, { target: { value: 'Price?' } })
  fireEvent.submit(input.closest('form')!)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to reach the product assistant. Please try again.'
  )
  fireEvent.change(input, { target: { value: 'Try again' } })
  expect(screen.getByRole('button', { name: 'Send question' })).toBeEnabled()
})

import { fireEvent, render, screen } from '@testing-library/react'
import ProductChatModal from '@/components/product/ProductChatModal'

jest.mock('@/components/chat/Chat', () => {
  throw new Error('private chunk URL')
})

it('contains a rejected chat import and keeps the modal closable', async () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
  const onClose = jest.fn()
  try {
    render(<ProductChatModal productId="phone" onClose={onClose} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The assistant could not be displayed'
    )
    expect(screen.queryByText('private chunk URL')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  } finally {
    errors.mockRestore()
  }
})

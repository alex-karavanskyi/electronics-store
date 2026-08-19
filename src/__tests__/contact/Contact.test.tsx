import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Contact from '@/components/contact/Contact'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('Contact', () => {
  it('displays the contact form with submit disabled initially', () => {
    render(<Contact />)

    expect(screen.getByRole('heading', { name: 'Contact Us' })).toBeVisible()
    expect(screen.getByPlaceholderText('Alex')).toBeVisible()
    expect(screen.getByPlaceholderText('alex@email.com')).toBeVisible()
    expect(
      screen.getByPlaceholderText('Tell us how we can help...')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled()
  })

  it('shows validation errors for invalid contact details', async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await user.type(screen.getByPlaceholderText('Alex'), 'Al')
    await user.type(screen.getByPlaceholderText('alex@email.com'), 'invalid')
    await user.type(
      screen.getByPlaceholderText('Tell us how we can help...'),
      'Too short'
    )

    expect(
      await screen.findByText('Name must be at least 3 characters')
    ).toBeVisible()
    expect(screen.getByText('Email must be valid')).toBeVisible()
    expect(
      screen.getByText('Message must be at least 15 characters')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled()
  })

  it('submits valid details and resets the form', async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    render(<Contact />)

    const name = screen.getByPlaceholderText('Alex')
    const email = screen.getByPlaceholderText('alex@email.com')
    const message = screen.getByPlaceholderText('Tell us how we can help...')

    await user.type(name, 'Alex')
    await user.type(email, 'alex@example.com')
    await user.type(message, 'I need help with my recent order.')
    await user.click(screen.getByRole('button', { name: 'Send Message' }))

    expect(alertSpy).toHaveBeenCalledWith(
      JSON.stringify({
        name: 'Alex',
        email: 'alex@example.com',
        message: 'I need help with my recent order.',
      })
    )
    await waitFor(() => expect(name).toHaveValue(''))

    alertSpy.mockRestore()
  })
})

import { MemoryRouter } from 'react-router-dom'
import { render as baseRender, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Contact from '@/components/contact/Contact'

describe('Contact', () => {
  it('displays the contact form with submit disabled initially', () => {
    render(<Contact />)

    expect(screen.getByRole('heading', { name: 'Contact Us' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled()
  })

  it('shows validation errors for invalid contact details', async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Al')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'invalid')
    await user.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'Too short'
    )

    expect(
      await screen.findByText('Name must be at least 3 characters')
    ).toBeVisible()
    expect(screen.getByText('Email must be valid')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(
      screen.getByRole('textbox', { name: 'Email' })
    ).toHaveAccessibleDescription('Email must be valid')
    expect(
      screen.getByText('Message must be at least 15 characters')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled()
  })

  it('submits valid details and resets the form', async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    render(<Contact />)

    const name = screen.getByRole('textbox', { name: 'Name' })
    const email = screen.getByRole('textbox', { name: 'Email' })
    const message = screen.getByRole('textbox', { name: 'Message' })

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

function render(ui: React.ReactElement) {
  return baseRender(<MemoryRouter>{ui}</MemoryRouter>)
}

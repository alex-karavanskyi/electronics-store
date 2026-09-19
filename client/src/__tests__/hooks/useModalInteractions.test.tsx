import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useModalInteractions from '@/shared/hooks/useModalInteractions'

function Example() {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  useModalInteractions({
    isOpen: open,
    initialFocusRef: closeRef,
    onClose: () => setOpen(false),
  })
  return (
    <>
      <button onClick={() => setOpen(true)}>Open example</button>
      {open &&
        createPortal(
          <div role="dialog" aria-label="Example">
            <button ref={closeRef} onClick={() => setOpen(false)}>
              Close example
            </button>
            <input aria-label="Question" />
            <select aria-label="Choice">
              <option>One</option>
            </select>
            <textarea aria-label="Details" />
            <button disabled>Unavailable</button>
            <button hidden>Hidden</button>
          </div>,
          document.body
        )}
    </>
  )
}

it('keeps form controls in the focus loop and restores focus on Escape', async () => {
  const user = userEvent.setup()
  const { container } = render(<Example />)
  const opener = screen.getByRole('button', { name: 'Open example' })
  await user.click(opener)
  expect(screen.getByRole('button', { name: 'Close example' })).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('textbox', { name: 'Details' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Close example' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveFocus()
  expect(container).toHaveAttribute('inert')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(container).not.toHaveAttribute('inert')
  expect(opener).toHaveFocus()
  expect(document.body.style.overflow).toBe('')
})

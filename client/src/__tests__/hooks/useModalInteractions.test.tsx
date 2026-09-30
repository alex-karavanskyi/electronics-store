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

function FocusableExample({ dynamic = false }: { dynamic?: boolean }) {
  const [open, setOpen] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  useModalInteractions({
    isOpen: open,
    initialFocusRef: closeRef,
    onClose: () => setOpen(false),
  })

  return (
    <>
      <button onClick={() => setOpen(true)}>Open focus example</button>
      {open &&
        createPortal(
          <div role="dialog" aria-label="Focus example">
            <button ref={closeRef} onClick={() => setOpen(false)}>
              Close focus example
            </button>
            <div hidden>
              <button>Hidden ancestor action</button>
            </div>
            <div
              ref={node => {
                node?.setAttribute('inert', '')
              }}
            >
              <button>Inert ancestor action</button>
            </div>
            <div style={{ display: 'none' }}>
              <button>Display hidden action</button>
            </div>
            <div style={{ visibility: 'hidden' }}>
              <button>Visibility hidden action</button>
            </div>
            <button disabled>Disabled action</button>
            {dynamic ? (
              <>
                <button onClick={() => setShowExtra(value => !value)}>
                  Toggle action
                </button>
                {showExtra && <button>Added action</button>}
              </>
            ) : (
              <button>Last action</button>
            )}
          </div>,
          document.body
        )}
    </>
  )
}

it('skips disabled controls and controls inside hidden or inert ancestors', async () => {
  const user = userEvent.setup()
  render(<FocusableExample />)
  await user.click(screen.getByRole('button', { name: 'Open focus example' }))
  expect(screen.getByRole('button', { name: 'Close focus example' })).toHaveFocus()

  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Close focus example' })).toHaveFocus()
})

it('updates the focus loop as controls are added and removed', async () => {
  const user = userEvent.setup()
  render(<FocusableExample dynamic />)
  await user.click(screen.getByRole('button', { name: 'Open focus example' }))
  const close = screen.getByRole('button', { name: 'Close focus example' })
  const toggle = screen.getByRole('button', { name: 'Toggle action' })

  await user.tab({ shift: true })
  expect(toggle).toHaveFocus()

  await user.click(toggle)
  close.focus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Added action' })).toHaveFocus()

  await user.click(toggle)
  close.focus()
  await user.tab({ shift: true })
  expect(toggle).toHaveFocus()
})

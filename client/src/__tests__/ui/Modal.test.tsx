import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '@/shared/ui/Modal'

it('uses current callbacks without resetting focus, and releases the background on close', async () => {
  const oldClose = jest.fn()
  const oldAfter = jest.fn()
  const close = jest.fn()
  const after = jest.fn()
  const content = (
    <>
      <button>Close</button>
      <input aria-label="Draft" />
    </>
  )
  const { rerender, container } = render(
    <Modal
      title="Example"
      className="backdrop"
      onClose={oldClose}
      onAfterClose={oldAfter}
    >
      {content}
    </Modal>
  )
  const draft = screen.getByRole('textbox')
  draft.focus()
  rerender(
    <Modal
      title="Example"
      className="backdrop"
      onClose={close}
      onAfterClose={after}
    >
      {content}
    </Modal>
  )
  expect(draft).toHaveFocus()
  expect(container).toHaveAttribute('aria-hidden', 'true')
  expect(getComputedStyle(document.body).overflow).toBe('hidden')
  fireEvent.keyDown(draft, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  expect(oldClose).not.toHaveBeenCalled()
  // Caller-controlled closing allows forms to reject dismissal while saving.
  expect(screen.getByRole('dialog', { name: 'Example' })).toBeInTheDocument()
  expect(after).not.toHaveBeenCalled()
  rerender(<></>)
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1))
  expect(oldAfter).not.toHaveBeenCalled()
  expect(container).not.toHaveAttribute('aria-hidden')
  expect(getComputedStyle(document.body).overflow).not.toBe('hidden')
})

function Example() {
  const [open, setOpen] = useState(false)
  const [extra, setExtra] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open example</button>
      {open && (
        <Modal
          title="Example"
          className="backdrop"
          onClose={() => setOpen(false)}
        >
          <button onClick={() => setOpen(false)}>Close example</button>
          <input aria-label="Question" />
          <select aria-label="Choice">
            <option>One</option>
          </select>
          <textarea aria-label="Details" />
          <button disabled>Unavailable</button>
          <div hidden>
            <button>Hidden</button>
          </div>
          <button onClick={() => setExtra(value => !value)}>
            Toggle action
          </button>
          {extra && <button>Added action</button>}
        </Modal>
      )}
    </>
  )
}

it('keeps dynamic form controls in the focus loop and restores the opener after Escape', async () => {
  const user = userEvent.setup()
  render(<Example />)
  const opener = screen.getByRole('button', { name: 'Open example' })
  await user.click(opener)
  const close = screen.getByRole('button', { name: 'Close example' })
  const toggle = screen.getByRole('button', { name: 'Toggle action' })
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(toggle).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('combobox')).toHaveFocus()
  await user.click(toggle)
  close.focus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Added action' })).toHaveFocus()
  await user.click(toggle)
  close.focus()
  await user.tab({ shift: true })
  expect(toggle).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await waitFor(() => expect(opener).toHaveFocus())
})

it('closes on the backdrop but keeps the dialog open for content clicks', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Open example' }))
  await user.click(screen.getByRole('textbox', { name: 'Question' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.click(screen.getByRole('dialog'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('Escape closes only the top dialog and returns focus to its opener', async () => {
  function Nested() {
    const [outer, setOuter] = useState(false)
    const [inner, setInner] = useState(false)
    return (
      <>
        <button onClick={() => setOuter(true)}>Open outer</button>
        {outer && (
          <Modal
            title="Outer"
            className="backdrop"
            onClose={() => setOuter(false)}
          >
            <button onClick={() => setInner(true)}>Open inner</button>
            {inner && (
              <Modal
                title="Inner"
                className="backdrop"
                onClose={() => setInner(false)}
              >
                <button>Inner action</button>
              </Modal>
            )}
          </Modal>
        )}
      </>
    )
  }
  const user = userEvent.setup()
  render(<Nested />)
  const outerOpener = screen.getByRole('button', { name: 'Open outer' })
  await user.click(outerOpener)
  const innerOpener = screen.getByRole('button', { name: 'Open inner' })
  await user.click(innerOpener)
  await user.keyboard('{Escape}')
  expect(
    screen.queryByRole('dialog', { name: 'Inner' })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument()
  await waitFor(() => expect(innerOpener).toHaveFocus())
  expect(getComputedStyle(document.body).overflow).toBe('hidden')
  await user.keyboard('{Escape}')
  await waitFor(() => expect(outerOpener).toHaveFocus())
  expect(getComputedStyle(document.body).overflow).not.toBe('hidden')
})

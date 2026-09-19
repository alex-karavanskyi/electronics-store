import { RefObject, useEffect, useRef } from 'react'

interface UseModalInteractionsOptions {
  isOpen: boolean
  initialFocusRef: RefObject<HTMLElement>
  onClose: () => void
}

const useModalInteractions = ({
  isOpen,
  initialFocusRef,
  onClose,
}: UseModalInteractionsOptions) => {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const dialog =
      initialFocusRef.current?.closest<HTMLElement>('[role="dialog"]')
    if (!dialog) return
    const opener = document.activeElement
    const bodyOverflow = document.body.style.overflow
    const htmlOverflow = document.documentElement.style.overflow
    const background = Array.from(document.body.children).filter(
      element => !element.contains(dialog)
    )
    const previousInert = background.map(element =>
      element.hasAttribute('inert')
    )
    background.forEach(element => element.setAttribute('inert', ''))
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]'
        )
      ).filter(element => {
        if (
          element.tabIndex < 0 ||
          element.matches(':disabled') ||
          element.closest('[hidden], [inert]')
        )
          return false
        for (
          let parent: HTMLElement | null = element;
          parent;
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden')
            return false
        }
        return true
      })
    const focusFirst = () => (getFocusable()[0] ?? dialog).focus()
    if (initialFocusRef.current !== dialog) initialFocusRef.current?.focus()
    else focusFirst()

    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target))
        focusFirst()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first) {
        event.preventDefault()
        dialog.focus()
        return
      }
      if (!focusable.some(element => element === document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocus)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocus)
      background.forEach((element, index) => {
        if (!previousInert[index]) element.removeAttribute('inert')
      })
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = htmlOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [initialFocusRef, isOpen])
}
export default useModalInteractions

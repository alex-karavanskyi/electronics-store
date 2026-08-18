import { RefObject, useEffect, useRef } from 'react'

interface UseModalInteractionsOptions {
  isOpen: boolean
  initialFocusRef: RefObject<HTMLElement>
  onClose: () => void
}

const FOCUSABLE_ELEMENTS =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

const useModalInteractions = ({
  isOpen,
  initialFocusRef,
  onClose,
}: UseModalInteractionsOptions) => {
  const onCloseRef = useRef(onClose)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    returnFocusRef.current = document.activeElement as HTMLElement | null
    const bodyOverflow = document.body.style.overflow
    const htmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    initialFocusRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = initialFocusRef.current?.closest('[role="dialog"]')
      const focusable =
        dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)

      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = htmlOverflow
      returnFocusRef.current?.focus()
    }
  }, [initialFocusRef, isOpen])
}

export default useModalInteractions

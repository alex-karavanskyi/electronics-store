import { type ReactNode, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface ModalProps {
  children: ReactNode
  className: string
  title: string
  labelledBy?: string
  describedBy?: string
  onClose: () => void
  onAfterClose?: () => void
}

const Modal = ({
  children,
  className,
  title,
  labelledBy,
  describedBy,
  onClose,
  onAfterClose,
}: ModalProps) => {
  const opener = useRef<HTMLElement | null>(null)
  return (
    <Dialog.Root
      open
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <Dialog.Content
            className={className}
            aria-label={labelledBy ? undefined : title}
            {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
            aria-describedby={describedBy}
            onOpenAutoFocus={() => {
              opener.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null
            }}
            onCloseAutoFocus={event => {
              // Callers mount dialogs conditionally, without a Radix Trigger.
              event.preventDefault()
              if (opener.current?.isConnected) opener.current.focus()
              onAfterClose?.()
            }}
            onMouseDown={event => {
              if (event.target === event.currentTarget) onClose()
            }}
          >
            <Dialog.Title hidden>{title}</Dialog.Title>
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export default Modal

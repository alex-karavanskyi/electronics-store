import { ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import useModalInteractions from '@/shared/hooks/useModalInteractions'

interface ModalProps {
  children: ReactNode
  className: string
  label?: string
  labelledBy?: string
  describedBy?: string
  onClose: () => void
}

const Modal = ({
  children,
  className,
  label,
  labelledBy,
  describedBy,
  onClose,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  useModalInteractions({ isOpen: true, initialFocusRef: dialogRef, onClose })
  return createPortal(
    <div
      ref={dialogRef}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>,
    document.body
  )
}
export default Modal

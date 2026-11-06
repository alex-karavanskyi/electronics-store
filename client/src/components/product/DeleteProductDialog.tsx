import { useId, useRef, type RefObject } from 'react'
import type { Product } from '@/shared/types/productSchema'
import Modal from '@/shared/ui/Modal'
import {
  useProductMutation,
  productWriteError,
} from '@/shared/hooks/useProductMutation'
import styles from './ProductManagement.module.scss'

export default function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
  returnFocusRef,
}: {
  product: Product
  onClose: () => void
  onDeleted: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const id = useId()
  const busy = useRef(false)
  const deleted = useRef(false)
  const mutation = useProductMutation()
  const close = () => {
    if (!busy.current && !mutation.isSaving) onClose()
  }
  const remove = async () => {
    if (busy.current || mutation.isSaving) return
    busy.current = true
    try {
      await mutation.mutateAsync({ kind: 'delete', id: product.id })
      deleted.current = true
      if (mutation.isCurrent()) onDeleted()
    } catch {
      // Keep confirmation open so the error is visible.
    } finally {
      busy.current = false
    }
  }
  return (
    <Modal
      className={styles.backdrop}
      labelledBy={`${id}-title`}
      describedBy={`${id}-description`}
      onClose={close}
      onAfterClose={() => {
        // A fast list refresh may unmount the row before mutateAsync returns.
        // Focus the stable list only after the modal has released its trap.
        if (busy.current || deleted.current) returnFocusRef?.current?.focus()
      }}
    >
      <section className={styles.dialog} aria-busy={mutation.isSaving}>
        <h2 id={`${id}-title`}>Delete Product</h2>
        <p id={`${id}-description`}>
          Delete “{product.name}” permanently? This cannot be undone.
        </p>
        {mutation.error && (
          <p role="alert" className={styles.error}>
            {productWriteError(mutation.error)}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={close} disabled={mutation.isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              void remove()
            }}
            disabled={mutation.isSaving}
          >
            {mutation.isSaving ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </section>
    </Modal>
  )
}

import { lazy, Suspense } from 'react'

import type { Product } from '@/shared/types/productSchema'
import Modal from '@/shared/ui/Modal'

import styles from './ProductChatModal.module.scss'

const Chat = lazy(() => import('@/components/chat/Chat'))

type ProductChatModalProps = {
  productId: Product['id']
  onClose: () => void
}

const ProductChatModal = ({ productId, onClose }: ProductChatModalProps) => (
  <Modal
    className={styles.chatModal}
    label="Product assistant"
    onClose={onClose}
  >
    <div aria-hidden="true" className={styles.chatOverlay} onClick={onClose} />
    <div className={styles.chatContent}>
      <div className={styles.chatHeader}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close chat"
        >
          {'\u2715'}
        </button>
      </div>
      <div className={styles.chatWrapper}>
        <Suspense fallback={<p role="status">Loading assistant...</p>}>
          <Chat productId={productId} />
        </Suspense>
      </div>
    </div>
  </Modal>
)

export default ProductChatModal

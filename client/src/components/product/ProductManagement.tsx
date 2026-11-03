import { useState, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccess } from '@/shared/auth/useAccess'
import { useMyProducts } from '@/shared/hooks/useMyProducts'
import type { Product } from '@/shared/types/productSchema'
import ProductFormModal from './ProductFormModal'
import DeleteProductDialog from './DeleteProductDialog'
import styles from './ProductManagement.module.scss'

type Props = {
  product?: Product
  onDeleted?: () => void
  returnFocusRef?: RefObject<HTMLElement>
}
export default function ProductManagement(props: Props) {
  const access = useAccess()
  if (access.status !== 'authenticated') return null
  const key = `${access.userId}:${access.isAdmin}:${props.product?.id ?? 'new'}`
  if (props.product && !access.isAdmin)
    return <OwnedManagement key={key} {...props} product={props.product} />
  return <ManagementSession key={key} {...props} />
}

function OwnedManagement(props: Props & { product: Product }) {
  const owned = useMyProducts()
  if (
    !owned.isSuccess ||
    owned.error ||
    !owned.data.some(item => item.id === props.product.id)
  )
    return null
  return <ManagementSession {...props} />
}

function ManagementSession({ product, onDeleted, returnFocusRef }: Props) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<{
    kind: 'form' | 'delete'
    product?: Product
  } | null>(null)
  const [saved, setSaved] = useState<Product | null>(null)
  return (
    <div
      className={[styles.management, !product ? styles.catalogManagement : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            setSaved(null)
            setDialog({ kind: 'form', product })
          }}
        >
          {product ? 'Edit Product' : 'Add Product'}
        </button>
        {product && (
          <button
            type="button"
            className={styles.deleteLink}
            onClick={() => {
              setSaved(null)
              setDialog({ kind: 'delete', product })
            }}
          >
            Delete Product
          </button>
        )}
      </div>
      {saved && (
        <p role="status">
          {product ? 'Product updated.' : 'Product created.'}{' '}
          <Link to={'/product/' + encodeURIComponent(saved.id)}>
            View {saved.name}
          </Link>
        </p>
      )}
      {dialog?.kind === 'form' && (
        <ProductFormModal
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={result => {
            setDialog(null)
            setSaved(result)
          }}
        />
      )}
      {dialog?.kind === 'delete' && dialog.product && (
        <DeleteProductDialog
          product={dialog.product}
          returnFocusRef={returnFocusRef}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null)
            if (onDeleted) onDeleted()
            else navigate('/#collection', { replace: true })
          }}
        />
      )}
    </div>
  )
}

import { useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Product } from '@/shared/types/productSchema'
import Modal from '@/shared/ui/Modal'
import {
  useProductMutation,
  productWriteError,
} from '@/shared/hooks/useProductMutation'
import {
  createProductFormSchema,
  getProductChanges,
  toProductInput,
  type ProductFormValues,
} from './productFormSchema'
import styles from './ProductManagement.module.scss'

type Props = {
  product?: Product
  onClose: () => void
  onSaved: (product: Product) => void
}

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const id = useId()
  const busy = useRef(false)
  const mutation = useProductMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(createProductFormSchema(product)),
    defaultValues: {
      name: product?.name ?? '',
      price: product?.price ?? NaN,
      description: product?.description ?? '',
      category: product?.category ?? '',
      imagesText: product?.images.join('\n') ?? '',
    },
  })
  const pending = isSubmitting || mutation.isSaving
  const close = () => {
    if (!busy.current && !pending) onClose()
  }
  const submit = handleSubmit(async values => {
    if (busy.current || mutation.isSaving) return
    busy.current = true
    try {
      const input = product
        ? getProductChanges(values, product)
        : toProductInput(values)
      if (product && Object.keys(input).length === 0) {
        onClose()
        return
      }
      const saved = await mutation.mutateAsync(
        product
          ? { kind: 'update', id: product.id, input }
          : { kind: 'create', input: toProductInput(values) }
      )
      if (saved && mutation.isCurrent()) onSaved(saved)
    } catch {
      // Mutation state displays the server error; retain the user's draft.
    } finally {
      busy.current = false
    }
  })
  const fieldProps = (name: keyof ProductFormValues) => ({
    id: `${id}-${name}`,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  })
  const fieldError = (name: keyof ProductFormValues) =>
    errors[name] && (
      <p id={`${id}-${name}-error`} className={styles.error}>
        {errors[name]?.message}
      </p>
    )

  return (
    <Modal
      className={styles.backdrop}
      labelledBy={`${id}-title`}
      onClose={close}
    >
      <section className={styles.dialog}>
        <h2 id={`${id}-title`}>{product ? 'Edit Product' : 'Add Product'}</h2>
        <form noValidate onSubmit={submit} aria-busy={pending}>
          <fieldset disabled={pending} className={styles.fields}>
            <div>
              <label htmlFor={`${id}-name`}>Name</label>
              <input
                {...fieldProps('name')}
                {...register('name')}
                autoComplete="off"
              />
              {fieldError('name')}
            </div>
            <div>
              <label htmlFor={`${id}-price`}>Price</label>
              <input
                {...fieldProps('price')}
                {...register('price', { valueAsNumber: true })}
                type="number"
                min="0"
                max="1000000000"
                step="any"
              />
              {fieldError('price')}
            </div>
            <div>
              <label htmlFor={`${id}-category`}>Category</label>
              <input {...fieldProps('category')} {...register('category')} />
              {fieldError('category')}
            </div>
            <div>
              <label htmlFor={`${id}-description`}>Description</label>
              <textarea
                {...fieldProps('description')}
                {...register('description')}
                rows={4}
              />
              {fieldError('description')}
            </div>
            <div>
              <label htmlFor={`${id}-imagesText`}>Image URLs</label>
              <textarea
                {...fieldProps('imagesText')}
                {...register('imagesText')}
                rows={3}
                spellCheck={false}
              />
              <p className={styles.hint}>
                One HTTPS URL per line, up to 20 images. Leave empty for no
                images.
              </p>
              {fieldError('imagesText')}
            </div>
          </fieldset>
          {mutation.error && (
            <p role="alert" className={styles.error}>
              {productWriteError(mutation.error)}
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" onClick={close} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className={styles.primary} disabled={pending}>
              {pending
                ? 'Saving...'
                : product
                  ? 'Save changes'
                  : 'Create product'}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  )
}

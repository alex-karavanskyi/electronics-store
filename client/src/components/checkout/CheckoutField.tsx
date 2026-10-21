import type { UseFormRegisterReturn } from 'react-hook-form'
import styles from './CheckoutFields.module.scss'

interface CheckoutFieldProps {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  type?: string
  autoComplete: string
  placeholder: string
  wide?: boolean
}

export default function CheckoutField({
  label,
  registration,
  error,
  type,
  autoComplete,
  placeholder,
  wide = false,
}: CheckoutFieldProps) {
  const id = `checkout-${registration.name}`
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...registration}
      />
      {error && (
        <span id={errorId} className={styles.error} aria-live="polite">
          {error}
        </span>
      )}
    </div>
  )
}

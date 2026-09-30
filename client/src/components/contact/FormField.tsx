import { useId } from 'react'

import type { UseFormRegisterReturn } from 'react-hook-form'

import styles from './Contact.module.scss'

type FormFieldProps = {
  label: string
  placeholder: string
  registration: UseFormRegisterReturn
  error?: string
  type?: string
  autoComplete?: string
  rows?: number
  as?: 'input' | 'textarea'
}

const FormField = ({
  label,
  placeholder,
  registration,
  error,
  type,
  autoComplete,
  rows,
  as = 'input',
}: FormFieldProps) => {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
  const className = error ? styles.error : ''

  return (
    <div className={styles.field}>
      <label htmlFor={id}> {label}</label>
      {as === 'textarea' ? (
        <textarea
          rows={rows}
          className={className}
          placeholder={placeholder}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          {...registration}
        />
      ) : (
        <input
          className={className}
          placeholder={placeholder}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          type={type}
          autoComplete={autoComplete}
          {...registration}
        />
      )}
      {error && (
        <span id={errorId} className={styles['error-text']}>
          {error}
        </span>
      )}
    </div>
  )
}

export default FormField

import { useId } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Breadcrumbs } from '@/shared/ui'

import styles from './Contact.module.scss'

const contactSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Email must be valid'),
  message: z.string().min(15, 'Message must be at least 15 characters'),
})

type FormData = z.infer<typeof contactSchema>

const Contact = () => {
  const id = useId()
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = (data: FormData) => {
    alert(JSON.stringify(data))
    reset()
  }

  return (
    <section className={styles.container}>
      <Breadcrumbs name="Contact" />

      <div className={styles.contact}>
        <div className={styles.contact__header}>
          <h2>Contact Us</h2>
          <p>
            Have a question about an order, product or collaboration? Fill out
            the form below and we will get back to you as soon as possible.
          </p>
        </div>

        <form
          noValidate
          className={styles.contact__form}
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={styles.field}>
            <label htmlFor={`${id}-name`}> Name</label>

            <input
              className={errors.name ? styles.error : ''}
              placeholder="Alex"
              id={`${id}-name`}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
              autoComplete="name"
              {...register('name')}
            />

            {errors.name && (
              <span id={`${id}-name-error`} className={styles['error-text']}>
                {errors.name.message}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${id}-email`}> Email</label>

            <input
              className={errors.email ? styles.error : ''}
              placeholder="alex@email.com"
              id={`${id}-email`}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
              type="email"
              autoComplete="email"
              {...register('email')}
            />

            {errors.email && (
              <span id={`${id}-email-error`} className={styles['error-text']}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${id}-message`}> Message</label>

            <textarea
              rows={7}
              className={errors.message ? styles.error : ''}
              placeholder="Tell us how we can help..."
              id={`${id}-message`}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? `${id}-message-error` : undefined
              }
              {...register('message')}
            />

            {errors.message && (
              <span id={`${id}-message-error`} className={styles['error-text']}>
                {errors.message.message}
              </span>
            )}
          </div>

          <button disabled={!isValid} type="submit">
            Send Message
          </button>
        </form>
      </div>
    </section>
  )
}

export default Contact

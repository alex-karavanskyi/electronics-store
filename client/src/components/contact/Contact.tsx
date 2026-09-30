import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Breadcrumbs } from '@/shared/ui'

import styles from './Contact.module.scss'
import FormField from './FormField'

const contactSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Email must be valid'),
  message: z.string().min(15, 'Message must be at least 15 characters'),
})

type FormData = z.infer<typeof contactSchema>

const Contact = () => {
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
          <FormField
            label="Name"
            placeholder="Alex"
            autoComplete="name"
            registration={register('name')}
            error={errors.name?.message}
          />
          <FormField
            label="Email"
            placeholder="alex@email.com"
            type="email"
            autoComplete="email"
            registration={register('email')}
            error={errors.email?.message}
          />
          <FormField
            label="Message"
            placeholder="Tell us how we can help..."
            as="textarea"
            rows={7}
            registration={register('message')}
            error={errors.message?.message}
          />
          <button disabled={!isValid} type="submit">
            Send Message
          </button>
        </form>
      </div>
    </section>
  )
}

export default Contact

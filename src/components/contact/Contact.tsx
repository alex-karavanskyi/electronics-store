'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { z } from 'zod'

import { device } from '@/shared/constants/device'
import { Breadcrumbs } from '@/shared/ui'

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
    <Container>
      <Breadcrumbs name="Contact" />

      <div className="contact">
        <div className="contact__header">
          <h2>Contact Us</h2>
          <p>
            Have a question about an order, product or collaboration? Fill out
            the form below and we will get back to you as soon as possible.
          </p>
        </div>

        <form className="contact__form" onSubmit={handleSubmit(onSubmit)}>
          <div className="field">
            <label>Name</label>

            <input
              className={errors.name ? 'error' : ''}
              placeholder="Alex"
              {...register('name')}
            />

            {errors.name && (
              <span className="error-text">{errors.name.message}</span>
            )}
          </div>

          <div className="field">
            <label>Email</label>

            <input
              className={errors.email ? 'error' : ''}
              placeholder="alex@email.com"
              {...register('email')}
            />

            {errors.email && (
              <span className="error-text">{errors.email.message}</span>
            )}
          </div>

          <div className="field">
            <label>Message</label>

            <textarea
              rows={7}
              className={errors.message ? 'error' : ''}
              placeholder="Tell us how we can help..."
              {...register('message')}
            />

            {errors.message && (
              <span className="error-text">{errors.message.message}</span>
            )}
          </div>

          <button disabled={!isValid} type="submit">
            Send Message
          </button>
        </form>
      </div>
    </Container>
  )
}

const Container = styled.section`
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 1rem;

  .contact {
    margin-top: 2rem;
    padding: 2.5rem;
    border-radius: 24px;
    background: #181818;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    transition: 0.3s;
  }

  .contact:hover {
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  }

  .contact__header {
    margin-bottom: 2.5rem;
  }

  .contact__header h2 {
    color: #fff;
    font-size: 2rem;
    margin-bottom: 0.75rem;
    font-weight: 700;
  }

  .contact__header p {
    color: #b5b5b5;
    line-height: 1.7;
    max-width: 600px;
  }

  .contact__form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 650px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  label {
    color: #f5f5f5;
    font-size: 0.95rem;
    font-weight: 600;
  }

  input,
  textarea {
    width: 100%;
    padding: 1rem 1.1rem;
    background: #262626;
    border: 1px solid transparent;
    border-radius: 14px;
    color: white;
    font-size: 1rem;
    transition: 0.25s;
    resize: vertical;
  }

  input::placeholder,
  textarea::placeholder {
    color: #8a8a8a;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4f8cff;
    box-shadow: 0 0 0 4px rgba(79, 140, 255, 0.18);
  }

  input.error,
  textarea.error {
    border-color: #ff6b6b;
  }

  .error-text {
    color: #ff7c7c;
    font-size: 0.85rem;
  }

  button {
    margin-top: 0.5rem;
    width: fit-content;
    padding: 1rem 2rem;
    border: none;
    border-radius: 14px;
    background: white;
    color: black;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: 0.25s;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(255, 255, 255, 0.2);
  }

  button:disabled {
    background: #3b3b3b;
    color: #8d8d8d;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media ${device.mobile} {
    .contact {
      padding: 1.5rem;
    }

    .contact__header h2 {
      font-size: 1.75rem;
    }

    button {
      width: 100%;
    }
  }
`

export default Contact

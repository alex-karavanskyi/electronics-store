import { useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutSchema, type CheckoutFormData } from './checkoutSchema'

export default function useCheckoutForm(hasItems: boolean) {
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CheckoutFormData>({
    mode: 'onChange',
    resolver: zodResolver(checkoutSchema),
    shouldFocusError: false,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      deliveryTime: 'anytime',
      payment: 'delivery',
      comment: '',
      callback: true,
    },
  })

  function onSubmit() {
    if (hasItems) setSubmitted(true)
  }

  function onInvalid(invalidFields: FieldErrors<CheckoutFormData>) {
    const fields = Object.keys(invalidFields) as (keyof CheckoutFormData)[]
    for (const field of fields) {
      const section = formRef.current
        ?.querySelector(`[name="${field}"]`)
        ?.closest('details')
      if (section) section.open = true
    }
    if (fields[0]) setFocus(fields[0])
  }

  return {
    register,
    errors,
    isValid,
    isSubmitting,
    submitted,
    formRef,
    onSubmit: handleSubmit(onSubmit, onInvalid),
    onChange: () => setSubmitted(false),
  }
}

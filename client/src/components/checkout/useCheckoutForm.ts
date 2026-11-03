import { useEffect, useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutSchema, type CheckoutFormData } from './checkoutSchema'

export default function useCheckoutForm(
  cartKey: string,
  reviewCart: () => Promise<string | null>
) {
  const [submittedCart, setSubmittedCart] = useState<string | null>(null)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const editVersion = useRef(0)
  const cartVersion = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    cartVersion.current++
    setSubmittedCart(null)
  }, [cartKey])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
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

  async function onSubmit() {
    if (cartKey === '[]') return
    const version = editVersion.current
    const checkedCartVersion = cartVersion.current
    setSubmittedCart(null)
    setReviewMessage(null)
    let message = await reviewCart()
    if (!mounted.current || editVersion.current !== version) return
    if (!message && checkedCartVersion !== cartVersion.current)
      message =
        'Your cart has changed. Please review the items before continuing.'
    setReviewMessage(message)
    if (!message) setSubmittedCart(cartKey)
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
    submitted: submittedCart === cartKey,
    reviewMessage,
    formRef,
    onSubmit: handleSubmit(onSubmit, onInvalid),
    onChange: () => {
      editVersion.current++
      setSubmittedCart(null)
    },
  }
}

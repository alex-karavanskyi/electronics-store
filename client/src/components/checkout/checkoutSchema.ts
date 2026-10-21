import { z } from 'zod'

export const checkoutSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().trim().email('Email must be valid'),
  phone: z
    .string()
    .trim()
    .refine(value => {
      const digits = value.replace(/\D/g, '')
      return (
        /^\+?[\d\s()-]+$/.test(value) &&
        digits.length >= 7 &&
        digits.length <= 15
      )
    }, 'Enter a valid phone number (7–15 digits)'),
  address: z.string().trim().min(1, 'Street address is required'),
  city: z.string().trim().min(1, 'City is required'),
  postalCode: z.string().trim().min(1, 'Postal code is required'),
  country: z.string().trim().min(1, 'Country is required'),
  deliveryTime: z.enum(['anytime', 'morning', 'afternoon']),
  payment: z.literal('delivery'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment must be at most 1000 characters'),
  callback: z.boolean(),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>

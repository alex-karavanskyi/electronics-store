import { z } from 'zod'

export const productSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(200)
    .refine(id => id.trim().length > 0),
  name: z.string(),
  description: z.string(),
  image: z.string(),
  images: z.array(z.string()),
  price: z.number().nonnegative(),
  category: z.string(),
})

export type Product = z.infer<typeof productSchema>

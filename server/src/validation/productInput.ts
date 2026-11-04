import { z } from 'zod'
import { HttpError } from '../middleware/errors.js'

export const productWriteIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(id => Boolean(id.trim()) && !/^demo[_:]/.test(id))

// 2 MiB of image bytes encoded as base64, plus data URL headers for 20 files.
const maxImageCharacters = Math.ceil((2 * 1024 * 1024) / 3) * 4 + 20 * 40
const imageUrl = z
  .string()
  .max(2048)
  .url()
  .refine(value => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && !url.username && !url.password
    } catch {
      return false
    }
  })
export const productImagesSchema = z
  .array(
    z.union([
      imageUrl,
      z
        .string()
        .max(maxImageCharacters)
        .regex(
          /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/
        )
        .refine(value => value.slice(value.indexOf(',') + 1).length % 4 === 0),
    ])
  )
  .max(20)
  .refine(
    values =>
      values.reduce((sum, value) => sum + value.length, 0) <= maxImageCharacters
  )
  .refine(values => new Set(values).size === values.length)

const fields = z
  .object({
    name: z.string().trim().min(1).max(200),
    price: z.number().min(0).max(1_000_000_000),
    description: z.string().max(10000),
    category: z.string().trim().max(100),
    images: productImagesSchema,
  })
  .strict()

export const createProductSchema = fields.extend({
  description: fields.shape.description.default(''),
  category: fields.shape.category.default(''),
  images: fields.shape.images.default([]),
})
export const updateProductSchema = fields
  .partial()
  .refine(value => Object.keys(value).length > 0)
export const deleteProductBodySchema = z.object({}).strict()
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

export function parseProductInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new HttpError(400, 'Invalid product request')
  return parsed.data
}

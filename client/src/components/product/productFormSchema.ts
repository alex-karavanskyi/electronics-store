import { z } from 'zod'
import type { Product, ProductInput } from '@/shared/types/productSchema'

const parseImages = (text: string) =>
  text
    .split(/\r?\n/)
    .map(url => url.trim())
    .filter(Boolean)
const sameImages = (a: string[], b: string[]) =>
  a.length === b.length && a.every((url, index) => url === b[index])

export function createProductFormSchema(original?: Product) {
  const rules = {
    name: z.string().trim().min(1, 'Enter a product name').max(200),
    price: z
      .number({ error: 'Enter a price' })
      .min(0, 'Price cannot be negative')
      .max(1_000_000_000),
    description: z.string().max(10000),
    category: z.string().trim().max(100),
  }
  const fields = z.object({
    name: z.string(),
    price: z.number({ error: 'Enter a price' }),
    description: z.string(),
    category: z.string(),
    imagesText: z.string().superRefine((text, context) => {
      const images = parseImages(text)
      // Existing imports can contain legacy URLs. An unrelated edit must not
      // replace or revalidate a gallery that is not being submitted in PATCH.
      if (original && sameImages(images, original.images)) return
      const valid =
        images.length <= 20 &&
        new Set(images).size === images.length &&
        images.every(value => {
          try {
            const url = new URL(value)
            return (
              value.length <= 2048 &&
              url.protocol === 'https:' &&
              !url.username &&
              !url.password
            )
          } catch {
            return false
          }
        })
      if (!valid)
        context.addIssue({
          code: 'custom',
          message:
            'Use up to 20 unique HTTPS image URLs without credentials (one per line, up to 2048 characters each).',
        })
    }),
  })
  // Preserve untouched legacy values before normalization; PATCH will not
  // submit these fields. Keep validation issues on their individual inputs.
  return fields
    .superRefine((values, context) => {
      for (const name of [
        'name',
        'price',
        'description',
        'category',
      ] as const) {
        if (original && values[name] === original[name]) continue
        const result = rules[name].safeParse(values[name])
        if (!result.success)
          for (const issue of result.error.issues)
            context.addIssue({ ...issue, path: [name, ...issue.path] })
      }
    })
    .transform(values => ({
      ...values,
      name:
        original && values.name === original.name
          ? values.name
          : values.name.trim(),
      category:
        original && values.category === original.category
          ? values.category
          : values.category.trim(),
    }))
}

export const productFormSchema = createProductFormSchema()
export type ProductFormValues = z.infer<typeof productFormSchema>

export function toProductInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    price: values.price,
    description: values.description,
    category: values.category.trim(),
    images: parseImages(values.imagesText),
  }
}

export function getProductChanges(
  values: ProductFormValues,
  original: Product
): Partial<ProductInput> {
  const input = toProductInput(values)
  return {
    ...(values.name === original.name || input.name === original.name
      ? {}
      : { name: input.name }),
    ...(input.price === original.price ? {} : { price: input.price }),
    ...(input.description === original.description
      ? {}
      : { description: input.description }),
    ...(values.category === original.category ||
    input.category === original.category
      ? {}
      : { category: input.category }),
    ...(sameImages(input.images, original.images)
      ? {}
      : { images: input.images }),
  }
}

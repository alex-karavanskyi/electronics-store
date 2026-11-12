import { z } from 'zod'
import type { getProductModel } from '../models/product.js'
import { HttpError } from '../middleware/errors.js'

const responseSchema = z.object({
  categories: z.array(z.string()),
  featured: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .max(200)
          .refine(id => Boolean(id.trim())),
        name: z.string(),
        image: z.string(),
      })
    )
    .max(5),
})

export async function readMongoHome(
  model: ReturnType<typeof getProductModel>,
  signal?: AbortSignal
) {
  const options = {
    timeoutMS: 15000,
    maxTimeMS: 15000,
    signal,
    collation: { locale: 'simple' },
    allowDiskUse: true,
  }
  const visible = { $match: { catalogOrder: { $gte: 0 } } }
  const [categories, featured] = await Promise.all([
    model
      .aggregate<{ category: string }>([
        visible,
        {
          $project: {
            catalogOrder: 1,
            category: { $ifNull: ['$category', ''] },
          },
        },
        { $sort: { catalogOrder: 1, _id: 1 } },
        {
          $group: {
            _id: '$category',
            firstOrder: { $first: '$catalogOrder' },
            firstId: { $first: '$_id' },
          },
        },
        { $sort: { firstOrder: 1, firstId: 1 } },
        { $project: { _id: 0, category: '$_id' } },
      ])
      .option(options)
      .exec(),
    model
      .aggregate<{ id: string; name: string; image: string }>([
        visible,
        { $sort: { catalogOrder: 1, _id: 1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            image: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    { $ifNull: ['$imageUrls', '$images.secureUrl'] },
                    0,
                  ],
                },
                '',
              ],
            },
          },
        },
      ])
      .option(options)
      .exec(),
  ])
  const result = responseSchema.safeParse({
    categories: categories.map(row => row.category),
    featured,
  })
  if (!result.success)
    throw new HttpError(502, 'Invalid product service response')
  return result.data
}

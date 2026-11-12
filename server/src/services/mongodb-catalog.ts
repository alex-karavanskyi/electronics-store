import type { getProductModel } from '../models/product.js'
import { toProduct } from '../mappers/mongodb-product.js'
import { HttpError } from '../middleware/errors.js'
import { parseCatalogParams } from './catalog.js'

const visible = { catalogOrder: { $gte: 0 } }
const projection =
  '_id name price description category imageUrls images.secureUrl'
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\0/g, '\\x00')

export async function readMongoCatalog(
  model: ReturnType<typeof getProductModel>,
  params: URLSearchParams,
  signal?: AbortSignal
) {
  const {
    text,
    categories,
    minPrice,
    maxPrice,
    sort,
    requestedPage,
    pageSize,
  } = parseCatalogParams(params)
  const options = { timeoutMS: 15000, maxTimeMS: 15000, signal }
  const filter = {
    ...visible,
    ...(text
      ? { name: { $regex: '^' + escapeRegex(text), $options: 'i' } }
      : {}),
    // Regex equality stays exact even when name sorting uses ICU collation.
    ...(categories.length
      ? {
          $or: categories.map(category => ({
            category: { $regex: '\\A' + escapeRegex(category) + '\\z' },
          })),
        }
      : {}),
    ...(minPrice !== null || maxPrice !== null
      ? {
          price: {
            ...(minPrice !== null ? { $gte: minPrice } : {}),
            ...(maxPrice !== null ? { $lte: maxPrice } : {}),
          },
        }
      : {}),
  }
  const nameSort = sort === 'name-a' || sort === 'name-z'
  const direction = sort === 'price-highest' || sort === 'name-z' ? -1 : 1
  const order: Record<string, 1 | -1> = {
    [nameSort ? 'name' : 'price']: direction,
    catalogOrder: 1,
    _id: 1,
  }
  const collation = nameSort
    ? { locale: 'en', strength: 3 }
    : { locale: 'simple' }

  // Keep images out of aggregations: a list page may exceed BSON's 16 MiB
  // single-document limit. Only the selected page's DTO fields reach Node.
  const [minimum, maximum] = await Promise.all([
    model
      .findOne(visible)
      .select('price')
      .sort({ price: 1 })
      .collation({ locale: 'simple' })
      .setOptions(options)
      .lean()
      .exec(),
    model
      .findOne(visible)
      .select('price')
      .sort({ price: -1 })
      .collation({ locale: 'simple' })
      .setOptions(options)
      .lean()
      .exec(),
  ])
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted()
    const total = await model.countDocuments(filter).setOptions(options).exec()
    const page = Math.min(
      requestedPage,
      Math.max(1, Math.ceil(total / pageSize))
    )
    const offset = (page - 1) * pageSize
    const records = total
      ? await model
          .find(filter)
          .select(projection)
          .sort(order)
          .collation(collation)
          .skip(offset)
          .limit(pageSize)
          .setOptions(options)
          .lean()
          .exec()
      : []
    // A deletion between count and find can invalidate the last page.
    // Recount once; never spin indefinitely while other users write.
    if (records.length < Math.min(pageSize, total - offset)) continue
    return {
      items: records.map(toProduct),
      total,
      page,
      pageSize,
      min_price: minimum?.price ?? 0,
      max_price: maximum?.price ?? 0,
    }
  }
  throw new HttpError(503, 'Catalog changed. Please try again.')
}

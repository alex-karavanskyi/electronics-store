import { Router } from 'express'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import { HttpError } from '../middleware/errors.js'
import { streamProductChat } from '../services/chat.js'
import type { ProductsService } from '../services/products.js'

// This chat only accepts text/reasoning history from the existing product assistant.
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.enum(['user', 'assistant']),
        parts: z
          .array(
            z.object({
              type: z.enum(['text', 'reasoning']),
              text: z.string().max(20000),
            })
          )
          .min(1)
          .max(100),
        metadata: z
          .object({ productId: z.string().min(1).max(200) })
          .optional(),
      })
    )
    .min(1)
    .max(100),
})
export function chatRouter(products: ProductsService, model?: LanguageModel) {
  const router = Router()
  router.post('/', async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid chat messages')
    const messages = parsed.data.messages
    const latest = messages[messages.length - 1]
    if (latest.role !== 'user' || !latest.metadata?.productId)
      throw new HttpError(
        400,
        'Product ID is required on the latest user message'
      )
    if (!model) throw new HttpError(503, 'Product assistant is unavailable')
    const abort = new AbortController()
    const onClose = () => abort.abort()
    res.once('close', onClose)
    try {
      const result = await streamProductChat({
        products,
        model,
        productId: latest.metadata.productId,
        messages,
        signal: abort.signal,
      })
      result.pipeUIMessageStreamToResponse(res, {
        onError: () =>
          'Product assistant is temporarily unavailable. Please try again.',
      })
    } catch (error) {
      res.off('close', onClose)
      throw error
    }
  })
  return router
}

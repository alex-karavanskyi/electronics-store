import { Router } from 'express'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import { HttpError } from '../middleware/errors.js'
import { streamProductChat } from '../services/chat.js'
import type { ProductsService } from '../services/products.js'

// This chat only accepts text/reasoning history from the existing product assistant.
const messagePartSchema = z.object({
  type: z.enum(['text', 'reasoning']),
  text: z.string().max(20000),
})

const chatMessageSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(['user', 'assistant']),
  parts: z.array(messagePartSchema).min(1).max(100),
  metadata: z.object({ productId: z.string().min(1).max(200) }).optional(),
})

const chatBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
})

export function chatRouter(products: ProductsService, model?: LanguageModel) {
  const router = Router()
  router.post('/', async (req, res) => {
    const parsedBody = chatBodySchema.safeParse(req.body)
    if (!parsedBody.success) throw new HttpError(400, 'Invalid chat messages')

    const messages = parsedBody.data.messages
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== 'user' || !latestMessage.metadata?.productId)
      throw new HttpError(
        400,
        'Product ID is required on the latest user message'
      )
    if (!model) throw new HttpError(503, 'Product assistant is unavailable')

    const abortController = new AbortController()
    const onClose = () => abortController.abort()
    res.once('close', onClose)
    try {
      const result = await streamProductChat({
        products,
        model,
        productId: latestMessage.metadata.productId,
        messages,
        signal: abortController.signal,
      })
      await result.pipeUIMessageStreamToResponse(res, {
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

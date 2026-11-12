import { Router } from 'express'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import { HttpError } from '../middleware/errors.js'
import { streamProductChat } from '../services/chat.js'
import type { ProductsService } from '../services/products.js'
import {
  CHAT_TIMEOUT_MS,
  type ChatAdmission,
} from '../services/chat-admission.js'

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

export function chatRouter(
  products: ProductsService,
  model: LanguageModel | undefined,
  admission: ChatAdmission | undefined,
  limits: { maxHistoryCharacters: number; maxOutputTokens: number }
) {
  const router = Router()
  router.post('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const parsedBody = chatBodySchema.safeParse(req.body)
    if (!parsedBody.success) throw new HttpError(400, 'Invalid chat messages')

    const messages = parsedBody.data.messages
    const historyCharacters = messages.reduce(
      (total, message) =>
        total + message.parts.reduce((sum, part) => sum + part.text.length, 0),
      0
    )
    if (historyCharacters > limits.maxHistoryCharacters)
      throw new HttpError(413, 'Chat history is too long. Start a new chat.')
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== 'user' || !latestMessage.metadata?.productId)
      throw new HttpError(
        400,
        'Product ID is required on the latest user message'
      )
    if (!model) throw new HttpError(503, 'Product assistant is unavailable')
    if (!admission)
      throw new HttpError(503, 'Product assistant is temporarily unavailable')

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), CHAT_TIMEOUT_MS)
    timeout.unref()
    const onClose = () => abortController.abort()
    res.once('close', onClose)
    let lease: Awaited<ReturnType<ChatAdmission['acquire']>> = null
    try {
      lease = await admission.acquire()
      if (!lease) {
        res.setHeader('Retry-After', '60')
        throw new HttpError(
          429,
          'Product assistant is busy. Please try again later.'
        )
      }
      abortController.signal.throwIfAborted()
      const result = await streamProductChat({
        products,
        model,
        productId: latestMessage.metadata.productId,
        messages,
        signal: abortController.signal,
        maxOutputTokens: limits.maxOutputTokens,
      })
      await result.pipeUIMessageStreamToResponse(res, {
        onError: () =>
          'Product assistant is temporarily unavailable. Please try again.',
      })
    } finally {
      abortController.abort()
      clearTimeout(timeout)
      res.off('close', onClose)
      // A cleanup outage cannot change a completed stream into an HTTP error.
      // The persistent lease expires even if this worker is terminated.
      await lease?.release().catch(() => {
        console.error('Chat admission release failed')
      })
    }
  })
  return router
}

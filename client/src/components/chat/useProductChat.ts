import { useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

import { apiUrl } from '@/shared/api/http'
import type { Product } from '@/shared/types/productSchema'

const transport = new DefaultChatTransport({ api: apiUrl('/chat') })

export const useProductChat = (productId: Product['id'] | null) => {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error, stop } = useChat({ transport })
  const isResponding = status === 'submitted' || status === 'streaming'
  const isSubmitDisabled = productId === null || !input.trim() || isResponding

  useEffect(() => {
    return () => {
      void stop()
    }
  }, [stop])

  const submitQuestion = () => {
    if (isSubmitDisabled) return

    void sendMessage({
      text: input,
      metadata: { productId },
    })
    setInput('')
  }

  return {
    input,
    setInput,
    messages,
    error,
    isResponding,
    isSubmitDisabled,
    submitQuestion,
  }
}

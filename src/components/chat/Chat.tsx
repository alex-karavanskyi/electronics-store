'use client'
import { useEffect, useRef, useState } from 'react'

import { useChat } from '@ai-sdk/react'
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'
import { IoSend } from 'react-icons/io5'

import { Product } from '@/shared/types/productsType'

import styles from './Chat.module.scss'

const Chat = ({ product }: { product: Product | null }) => {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const lastMessage = messages[messages.length - 1]
  const isDisabled = !product || !input.trim()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  const isStreamingMessage = (message: any, index: number) => {
    if (message.role !== 'assistant' || index !== messages.length - 1) {
      return false
    }

    const hasStreamingPart = message.parts.some(
      (part: any) =>
        (part.type === 'text' || part.type === 'reasoning') &&
        part.state === 'streaming'
    )

    return status === 'streaming' || status === 'submitted' || hasStreamingPart
  }

  const shouldShowTypingPlaceholder =
    (status === 'streaming' || status === 'submitted') &&
    (!lastMessage ||
      lastMessage.role === 'user' ||
      !isStreamingMessage(lastMessage, messages.length - 1))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isDisabled) return

    sendMessage({
      text: input,
      metadata: {
        product,
      },
    })

    setInput('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>🤖</span>
        <div>
          <strong>Product Assistant</strong>
          <small>Ask anything about this product</small>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <HiOutlineChatBubbleLeftRight size={56} />
            <p>Hi! 👋 Ask a question about the product</p>
          </div>
        ) : (
          <>
            {messages.map((message, messageIndex) => {
              const isStreaming = isStreamingMessage(message, messageIndex)

              return (
                <div
                  className={[
                    styles.message,
                    message.role === 'user' ? styles.user : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={message.id}
                >
                  <div>
                    {message.parts.map((part: any, i: number) => {
                      if (part.type === 'text' || part.type === 'reasoning') {
                        return (
                          <span key={`${message.id}-${i}`}>{part.text}</span>
                        )
                      }
                      return null
                    })}
                    {isStreaming && <span className={styles.cursor} />}
                  </div>
                </div>
              )
            })}
            {shouldShowTypingPlaceholder && (
              <div className={styles.message} key="typing-placeholder">
                <div>
                  <span className={styles.cursor} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className={styles.formContainer} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={input}
          placeholder="Your question..."
          onChange={e => setInput(e.currentTarget.value)}
          disabled={!product}
        />
        <button
          className={styles.sendButton}
          type="submit"
          disabled={isDisabled}
        >
          <IoSend size={20} />
        </button>
      </form>
    </div>
  )
}

export default Chat

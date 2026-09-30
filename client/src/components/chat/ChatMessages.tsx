import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'

import ChatMessage from './ChatMessage'
import styles from './Chat.module.scss'

type ChatMessagesProps = {
  messages: UIMessage[]
  isResponding: boolean
}

const ChatMessages = ({ messages, isResponding }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessage = messages[messages.length - 1]
  const isLastMessageStreaming =
    lastMessage?.role === 'assistant' &&
    (isResponding ||
      lastMessage.parts.some(
        part =>
          (part.type === 'text' || part.type === 'reasoning') &&
          part.state === 'streaming'
      ))
  const shouldShowTypingPlaceholder =
    isResponding && lastMessage?.role !== 'assistant'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={styles.messagesContainer}>
      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <HiOutlineChatBubbleLeftRight size={56} />
          <p>Hi! 👋 Ask a question about the product</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                index === messages.length - 1 && isLastMessageStreaming
              }
            />
          ))}
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
  )
}

export default ChatMessages

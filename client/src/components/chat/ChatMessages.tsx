import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'

import ChatMessage from './ChatMessage'
import styles from './Chat.module.scss'

type ChatMessagesProps = {
  messages: UIMessage[]
  isResponding: boolean
  onSuggestion?: (question: string) => void
}

const ChatMessages = ({
  messages,
  isResponding,
  onSuggestion,
}: ChatMessagesProps) => {
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
          <HiOutlineChatBubbleLeftRight aria-hidden="true" />
          <strong>Get to know this product</strong>
          <p>Explore the details and find out if it fits your needs.</p>
          {onSuggestion && (
            <div className={styles.suggestions} aria-label="Suggested questions">
              {[
                ['Key features', 'What are the key features of this product?'],
                ['Best for', 'Who is this product best suited for?'],
                [
                  'Compare options',
                  'What should I compare when choosing this product?',
                ],
              ].map(([label, question]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => onSuggestion(question)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
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

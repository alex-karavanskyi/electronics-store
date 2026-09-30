import type { UIMessage } from 'ai'

import styles from './Chat.module.scss'

type ChatMessageProps = {
  message: UIMessage
  isStreaming: boolean
}

const ChatMessage = ({ message, isStreaming }: ChatMessageProps) => (
  <div
    className={[styles.message, message.role === 'user' ? styles.user : '']
      .filter(Boolean)
      .join(' ')}
  >
    <div>
      {message.parts.map((part, index) => {
        if (part.type === 'text' || part.type === 'reasoning') {
          return <span key={`${message.id}-${index}`}>{part.text}</span>
        }
        return null
      })}
      {isStreaming && <span className={styles.cursor} />}
    </div>
  </div>
)

export default ChatMessage

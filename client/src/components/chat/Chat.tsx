import type { FormEvent } from 'react'
import { IoSend } from 'react-icons/io5'

import { useProductChat } from './useProductChat'
import type { Product } from '@/shared/types/productSchema'

import ChatMessages from './ChatMessages'
import styles from './Chat.module.scss'

type ChatProps = {
  productId: Product['id'] | null
}

const Chat = ({ productId }: ChatProps) => {
  const {
    input,
    setInput,
    messages,
    error,
    isResponding,
    isSubmitDisabled,
    submitQuestion,
  } = useProductChat(productId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion()
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

      <ChatMessages messages={messages} isResponding={isResponding} />

      {error && (
        <p role="alert">
          Unable to reach the product assistant. Please try again.
        </p>
      )}
      <form className={styles.formContainer} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={input}
          aria-label="Your question"
          placeholder="Your question..."
          onChange={event => setInput(event.currentTarget.value)}
          disabled={productId === null}
        />
        <button
          aria-label="Send question"
          className={styles.sendButton}
          type="submit"
          disabled={isSubmitDisabled}
        >
          <IoSend size={20} />
        </button>
      </form>
    </div>
  )
}

export default Chat

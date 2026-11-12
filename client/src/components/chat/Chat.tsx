import { useRef, type FormEvent } from 'react'
import { HiOutlineSparkles } from 'react-icons/hi2'
import { IoSend } from 'react-icons/io5'

import { useProductChat } from './useProductChat'
import type { Product } from '@/shared/types/productSchema'

import ChatMessages from './ChatMessages'
import styles from './Chat.module.scss'

type ChatProps = {
  productId: Product['id'] | null
}

const Chat = ({ productId }: ChatProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    input,
    setInput,
    messages,
    error,
    resetChat,
    isResponding,
    isSubmitDisabled,
    submitQuestion,
  } = useProductChat(productId)
  const statusCode =
    error && 'statusCode' in error ? error.statusCode : undefined
  const errorMessage =
    statusCode === 429
      ? 'The product assistant is busy. Please wait a minute and try again.'
      : statusCode === 413
        ? 'This conversation is too long. Start a new chat with a shorter question.'
        : 'Unable to reach the product assistant. Please try again.'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.assistantIcon}>
          <HiOutlineSparkles aria-hidden="true" />
        </span>
        <div>
          <strong>Product Assistant</strong>
          <small>Ask anything about this product</small>
        </div>
      </div>

      <ChatMessages
        messages={messages}
        isResponding={isResponding}
        onSuggestion={
          productId === null
            ? undefined
            : question => {
                setInput(question)
                inputRef.current?.focus()
              }
        }
      />

      {error && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}
      {statusCode === 413 && (
        <button type="button" onClick={resetChat} disabled={isResponding}>
          Start a new chat
        </button>
      )}
      <form className={styles.formContainer} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
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

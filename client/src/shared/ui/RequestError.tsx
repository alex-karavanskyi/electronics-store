import styles from './RequestError.module.scss'

interface RequestErrorProps {
  message: string
  onRetry: () => void
  isRetrying: boolean
  background?: boolean
}

export default function RequestError({
  message,
  onRetry,
  isRetrying,
  background = false,
}: RequestErrorProps) {
  return (
    <div className={styles.notice} role={background ? 'status' : 'alert'}>
      <p>{message}</p>
      <button type="button" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? 'Retrying...' : 'Try again'}
      </button>
    </div>
  )
}

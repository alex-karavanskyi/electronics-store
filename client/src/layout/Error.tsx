
import { useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import styles from './Error.module.scss'

interface ErrorProps {
  message?: string
  redirectTo?: string
  redirectDelay?: number
}

const Error: React.FC<ErrorProps> = ({
  message = 'Something went wrong',
  redirectTo,
  redirectDelay = 3000,
}) => {
  const navigate = useNavigate()

  useEffect(() => {
    if (redirectTo) {
      const timer = setTimeout(() => {
        navigate(redirectTo, { replace: true })
      }, redirectDelay)

      return () => clearTimeout(timer)
    }
  }, [redirectTo, redirectDelay, navigate])

  return (
    <div className={styles.errorWrapper}>
      <h2 className={styles.errorTitle}>{message}</h2>

      {redirectTo && (
        <p className={styles.redirectText}>
          You will be redirected in {Math.floor(redirectDelay / 1000)}{' '}
          seconds...
        </p>
      )}
    </div>
  )
}

export default Error

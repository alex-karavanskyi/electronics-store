import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import {
  retryProductNotification,
  type AdminProduct,
} from '@/shared/api/products'
import { adminProductsKey } from '@/shared/hooks/useAdminProducts'
import { ApiError } from '@/shared/api/http'

export default function ProductNotification({
  id,
  notification,
}: {
  id: string
  notification: AdminProduct['notification']
}) {
  const access = useAccess()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const current = useRef(access)
  current.current = access
  useEffect(() => () => active.current?.abort(), [])
  const retry = async () => {
    if (active.current || access.status !== 'authenticated' || !access.isAdmin)
      return
    const userId = access.userId
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError('')
    const assertCurrent = () => {
      if (
        controller.signal.aborted ||
        current.current.userId !== userId ||
        !current.current.isAdmin ||
        current.current.status !== 'authenticated'
      )
        throw new DOMException('Session changed', 'AbortError')
    }
    try {
      await retryProductNotification(
        id,
        async () => {
          assertCurrent()
          const token = await access.getToken()
          assertCurrent()
          return token
        },
        controller.signal
      )
      assertCurrent()
      await client.invalidateQueries({
        queryKey: adminProductsKey(userId),
        exact: true,
      })
    } catch (cause) {
      if (
        !controller.signal.aborted &&
        current.current.userId === userId &&
        current.current.isAdmin
      ) {
        setError(
          cause instanceof ApiError && cause.status === 409
            ? 'Notification is already sent or processing. Refresh the list.'
            : cause instanceof ApiError && cause.status === 404
              ? 'This product no longer exists. Refresh the list.'
              : 'Unable to retry notification. Please try again.'
        )
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      active.current = null
    }
  }
  if (!notification) return <p>Telegram: not requested</p>
  if (notification.channel !== 'telegram')
    return (
      <div>
        <p>Previous notification: {notification.status}</p>
        <p>This notification predates Telegram. Retry is unavailable.</p>
      </div>
    )
  const leased =
    notification.leaseUntil && Date.parse(notification.leaseUntil) > Date.now()
  return (
    <div>
      <p>Telegram: {notification.status}</p>
      {notification.status === 'sent' && <p>Accepted by Telegram.</p>}
      {notification.errorCode === 'configuration' && (
        <p>Telegram settings are incomplete or invalid.</p>
      )}
      {notification.status === 'failed' &&
        notification.errorCode !== 'configuration' && (
          <p>
            Telegram delivery was not confirmed. Check the sender settings or
            retry.
          </p>
        )}
      {notification.status === 'pending' && (
        <p>
          {leased
            ? 'Sending notification...'
            : 'Waiting for the next delivery attempt.'}
        </p>
      )}
      {notification.status !== 'sent' && (
        <button
          type="button"
          disabled={busy || Boolean(leased)}
          onClick={() => {
            void retry()
          }}
        >
          {busy ? 'Retrying notification...' : 'Retry notification'}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

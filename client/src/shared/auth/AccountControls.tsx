import { SignInButton, UserButton } from '@clerk/react'
import { GoPerson } from 'react-icons/go'
import { useAccess } from './useAccess'

export default function AccountControls({ className }: { className?: string }) {
  const { status } = useAccess()
  if (status === 'authenticated') {
    return (
      <div className={className}>
        <UserButton userProfileMode="modal" />
      </div>
    )
  }
  const label =
    status === 'loading'
      ? 'Loading account'
      : status === 'unavailable'
        ? 'Sign in unavailable'
        : 'Sign in or create account'
  const button = (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      disabled={status !== 'guest'}
    >
      <GoPerson aria-hidden="true" />
    </button>
  )
  return status === 'guest' ? (
    <SignInButton mode="modal">{button}</SignInButton>
  ) : (
    button
  )
}

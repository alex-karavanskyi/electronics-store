import { useMemo, type PropsWithChildren } from 'react'
import { ClerkProvider, useAuth } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import { clientEnv } from '@/shared/config/env'
import { AccessContext, unavailableAccess, type Access } from './useAccess'

function SessionAccess({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId, sessionClaims, getToken } = useAuth()
  const access = useMemo<Access>(() => {
    if (!isLoaded) return { ...unavailableAccess, status: 'loading' }
    if (!isSignedIn) return { ...unavailableAccess, status: 'guest' }
    return {
      status: 'authenticated',
      userId,
      isAdmin: sessionClaims.role === 'admin',
      getToken,
    }
  }, [isLoaded, isSignedIn, userId, sessionClaims, getToken])
  return (
    <AccessContext.Provider value={access}>{children}</AccessContext.Provider>
  )
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  if (!clientEnv.clerkPublishableKey) {
    return (
      <AccessContext.Provider value={unavailableAccess}>
        {children}
      </AccessContext.Provider>
    )
  }
  return (
    <ClerkProvider
      publishableKey={clientEnv.clerkPublishableKey}
      routerPush={to => navigate(to)}
      routerReplace={to => navigate(to, { replace: true })}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
      appearance={{
        elements: {
          modalBackdrop: { zIndex: 5000 },
          userButtonPopoverCard: { zIndex: 5001 },
        },
      }}
    >
      <SessionAccess>{children}</SessionAccess>
    </ClerkProvider>
  )
}

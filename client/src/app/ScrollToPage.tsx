import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function ScrollToPage() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const previousScrollKey = useRef<string | null>(null)

  useEffect(() => {
    const isInitialNavigation = previousScrollKey.current === null
    // Query-only filter changes should not trigger another scroll.
    const scrollKey = pathname + hash
    if (previousScrollKey.current === scrollKey) return
    previousScrollKey.current = scrollKey

    // Initial URL loads also use POP, so allow their hash navigation.
    if (navigationType === 'POP' && !isInitialNavigation) return

    if (hash) {
      let id = hash.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        /* Keep literal invalid escapes. */
      }
      document.getElementById(id)?.scrollIntoView()
    } else if (navigationType !== 'POP') {
      window.scrollTo({ top: 0 })
    }
  }, [pathname, hash, navigationType])
  return null
}

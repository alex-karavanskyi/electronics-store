import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Query-only navigation must not move the existing filter/pagination controls.
export default function ScrollToPage() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const previousPage = useRef<string | null>(null)
  useEffect(() => {
    const page = pathname + hash
    if (previousPage.current === page) return
    previousPage.current = page
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

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { THEME_STORAGE_KEY } from '@/shared/constants/localStorage'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const ThemeContext = createContext<{
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
} | null>(null)

function parseMode(value: string | null): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function readMode(): ThemeMode {
  try {
    return parseMode(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    // Storage can be blocked; the theme still works for this visit.
  }
  return 'system'
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  )
  const resolvedTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light')
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let storage: Storage
    try {
      storage = window.localStorage
    } catch {
      return
    }

    const syncTheme = (event: StorageEvent) => {
      if (event.storageArea !== storage) return
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
      // Remote changes update state only, avoiding writes back to other tabs.
      setModeState(parseMode(event.newValue))
    }

    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  function setMode(nextMode: ThemeMode) {
    setModeState(nextMode)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode)
    } catch {
      // Keep the user's choice in memory when persistence is unavailable.
    }
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used within ThemeProvider')
  return theme
}

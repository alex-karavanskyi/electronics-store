import { Toaster } from 'sonner'
import { useTheme } from '@/shared/lib/ThemeProvider'

export default function AppToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      theme={resolvedTheme}
      position="bottom-right"
      richColors
      closeButton
      duration={5000}
      visibleToasts={3}
    />
  )
}

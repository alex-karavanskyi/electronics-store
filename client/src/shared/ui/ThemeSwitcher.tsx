import { useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FiCheck, FiMonitor, FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '@/shared/lib/ThemeProvider'
import styles from './ThemeSwitcher.module.scss'

const options = [
  { mode: 'light', label: 'Light', Icon: FiSun },
  { mode: 'dark', label: 'Dark', Icon: FiMoon },
  { mode: 'system', label: 'System', Icon: FiMonitor },
] as const

export default function ThemeSwitcher() {
  const { mode, setMode } = useTheme()
  const selected = options.find(option => option.mode === mode)!
  const Icon = selected.Icon
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const entryMode = useRef(mode)
  const tabbing = useRef(false)

  return (
    <div className={styles.switcher}>
      <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            ref={trigger}
            type="button"
            className={styles.trigger}
            aria-label={`Theme: ${mode}`}
            title={`Theme: ${selected.label}`}
            onPointerDown={() => {
              entryMode.current = mode
            }}
            onKeyDown={event => {
              entryMode.current = event.key === 'ArrowDown' ? 'light' : mode
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                entryMode.current = 'system'
                setOpen(true)
              }
            }}
          >
            <Icon aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            aria-label="Theme"
            className={styles.menu}
            align="end"
            sideOffset={6}
            collisionPadding={8}
            loop
            onFocus={event => {
              if (event.target !== event.currentTarget) return
              event.preventDefault()
              event.currentTarget
                .querySelector<HTMLElement>(
                  `[data-mode="${entryMode.current}"]`
                )
                ?.focus()
            }}
            onKeyDownCapture={event => {
              if (event.key !== 'Tab') return
              // Let native Tab traversal continue from the trigger.
              event.stopPropagation()
              tabbing.current = true
              setOpen(false)
              trigger.current?.focus()
            }}
            onCloseAutoFocus={event => {
              if (tabbing.current) event.preventDefault()
              tabbing.current = false
            }}
          >
            <DropdownMenu.RadioGroup value={mode}>
              {options.map(option => (
                <DropdownMenu.RadioItem
                  key={option.mode}
                  value={option.mode}
                  data-mode={option.mode}
                  className={styles.item}
                  onSelect={() => setMode(option.mode)}
                >
                  {option.label}
                  <DropdownMenu.ItemIndicator>
                    <FiCheck aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

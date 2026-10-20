import { FiCheck, FiMonitor, FiMoon, FiSun } from 'react-icons/fi'
import useThemeMenu from '@/shared/hooks/useThemeMenu'
import { useTheme } from '@/shared/lib/ThemeProvider'
import styles from './ThemeSwitcher.module.scss'

const options = [
  { mode: 'light', label: 'Light', Icon: FiSun },
  { mode: 'dark', label: 'Dark', Icon: FiMoon },
  { mode: 'system', label: 'System', Icon: FiMonitor },
] as const

export default function ThemeSwitcher() {
  const { mode, setMode } = useTheme()
  const selected = options.findIndex(option => option.mode === mode)
  const Icon = options[selected].Icon
  const menu = useThemeMenu({
    selectedIndex: selected,
    itemCount: options.length,
  })

  return (
    <div
      ref={menu.containerRef}
      className={styles.switcher}
      onKeyDown={menu.handleKeyDown}
    >
      <button
        ref={menu.triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`Theme: ${mode}`}
        title={`Theme: ${options[selected].label}`}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? menu.menuId : undefined}
        onClick={menu.toggleMenu}
        onKeyDown={menu.handleTriggerKeyDown}
      >
        <Icon aria-hidden="true" />
      </button>
      {menu.open && (
        <div
          id={menu.menuId}
          role="menu"
          aria-label="Theme"
          className={styles.menu}
        >
          {options.map((option, index) => (
            <button
              key={option.mode}
              ref={element => {
                menu.itemRefs.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.mode}
              tabIndex={-1}
              onKeyDown={event => menu.handleItemKeyDown(event, index)}
              onClick={() => {
                setMode(option.mode)
                menu.closeMenu()
              }}
            >
              {option.label}
              {mode === option.mode && <FiCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

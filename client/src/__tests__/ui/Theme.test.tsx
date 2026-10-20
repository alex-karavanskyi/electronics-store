import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeProvider, { useTheme } from '@/shared/lib/ThemeProvider'
import ThemeSwitcher from '@/shared/ui/ThemeSwitcher'

const themeButton = () => screen.getByRole('button', { name: /^Theme:/ })
function chooseMode(mode: string) {
  fireEvent.click(themeButton())
  fireEvent.click(
    screen.getByRole('menuitemradio', {
      name: new RegExp('^' + mode + '$', 'i'),
    })
  )
}

let dark = false
let listeners: Set<() => void>

function changeSystem(value: boolean) {
  dark = value
  act(() => listeners.forEach(listener => listener()))
}

function Status() {
  const { resolvedTheme } = useTheme()
  return <output>{resolvedTheme}</output>
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemeSwitcher />
      <Status />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  dark = false
  listeners = new Set()
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() {
      return dark
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }))
})

afterEach(() => jest.restoreAllMocks())

function storageChange(
  newValue: string | null,
  key: string | null = 'volt_theme',
  storageArea = localStorage
) {
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue, storageArea })
    )
  )
}

it.each(['light', 'dark'])(
  'receives %s from another tab without writing it back',
  mode => {
    dark = mode === 'light'
    renderTheme()
    const write = jest.spyOn(Storage.prototype, 'setItem')
    storageChange(mode)
    expect(themeButton()).toHaveAccessibleName(`Theme: ${mode}`)
    expect(document.documentElement).toHaveAttribute('data-theme', mode)
    expect(write).not.toHaveBeenCalled()
  }
)

it('follows the OS when another tab selects system', () => {
  localStorage.setItem('volt_theme', 'light')
  renderTheme()
  changeSystem(true)
  storageChange('system')
  expect(themeButton()).toHaveAccessibleName('Theme: system')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  changeSystem(false)
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

it.each([null, 'invalid'])(
  'resets to system when a remote theme value is %s',
  value => {
    localStorage.setItem('volt_theme', 'light')
    dark = true
    renderTheme()
    storageChange(value)
    expect(themeButton()).toHaveAccessibleName('Theme: system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  }
)

it('resets to system when another tab clears localStorage', () => {
  localStorage.setItem('volt_theme', 'dark')
  renderTheme()
  storageChange(null, null)
  expect(themeButton()).toHaveAccessibleName('Theme: system')
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

it('ignores other storage keys and sessionStorage events', () => {
  localStorage.setItem('volt_theme', 'dark')
  renderTheme()
  storageChange('light', 'unrelated')
  storageChange('light', 'volt_theme', sessionStorage)
  expect(themeButton()).toHaveAccessibleName('Theme: dark')
})

it('removes the storage listener on unmount', () => {
  const add = jest.spyOn(window, 'addEventListener')
  const remove = jest.spyOn(window, 'removeEventListener')
  const { unmount } = renderTheme()
  const listener = add.mock.calls.find(([type]) => type === 'storage')?.[1]
  expect(listener).toBeDefined()
  unmount()
  expect(remove).toHaveBeenCalledWith('storage', listener)
})

it('supports keyboard selection, Escape and focus restoration', async () => {
  renderTheme()
  await userEvent.tab()
  expect(themeButton()).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveFocus()
  await userEvent.keyboard('{End}')
  expect(screen.getByRole('menuitemradio', { name: 'System' })).toHaveFocus()
  await userEvent.keyboard('{Home}{ArrowDown}{Enter}')
  expect(themeButton()).toHaveAccessibleName('Theme: dark')
  expect(themeButton()).toHaveFocus()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await userEvent.click(themeButton())
  expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await userEvent.keyboard('{Escape}')
  expect(themeButton()).toHaveFocus()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('closes on outside interaction and Tab', async () => {
  renderTheme()
  await userEvent.click(themeButton())
  await userEvent.click(document.body)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await userEvent.click(themeButton())
  await userEvent.tab()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it.each([
  [false, 'After theme'],
  [true, 'Before theme'],
])('moves focus outside the menu with Shift=%s and Tab', async (shift, name) => {
  const user = userEvent.setup()
  render(
    <ThemeProvider>
      <button>Before theme</button>
      <ThemeSwitcher />
      <button>After theme</button>
    </ThemeProvider>
  )

  await user.click(themeButton())
  // user-event 14 computes Tab's destination from the removed menu item.
  // Verify the handoff first, then simulate traversal from the trigger.
  expect(
    fireEvent.keyDown(screen.getByRole('menuitemradio', { name: 'System' }), {
      key: 'Tab',
      shiftKey: shift,
    })
  ).toBe(true)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(themeButton()).toHaveFocus()
  await user.tab({ shift })

  expect(screen.getByRole('button', { name })).toHaveFocus()
  expect(themeButton()).toHaveAccessibleName('Theme: system')
})

it.each([
  ['{ArrowDown}', 'Light', '{ArrowUp}', 'System', '{ArrowDown}'],
  ['{ArrowUp}', 'System', '{ArrowDown}', 'Light', '{ArrowUp}'],
])(
  'opens with %s and wraps focus at both ends of the menu',
  async (openKey, first, wrapKey, last, returnKey) => {
    const user = userEvent.setup()
    renderTheme()
    await user.tab()
    await user.keyboard(openKey)
    expect(screen.getByRole('menuitemradio', { name: first })).toHaveFocus()

    await user.keyboard(wrapKey)
    expect(screen.getByRole('menuitemradio', { name: last })).toHaveFocus()
    await user.keyboard(returnKey)
    expect(screen.getByRole('menuitemradio', { name: first })).toHaveFocus()
    expect(themeButton()).toHaveAccessibleName('Theme: system')
  }
)

it('selects a theme with Space and restores focus to the trigger', async () => {
  const user = userEvent.setup()
  renderTheme()
  await user.tab()
  await user.keyboard('{ArrowDown}{ArrowDown} ')

  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('volt_theme')).toBe('dark')
  expect(themeButton()).toHaveAccessibleName('Theme: dark')
  expect(themeButton()).toHaveFocus()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it.each([null, '', 'invalid', '"dark"'])(
  'defaults to system for stored value %s',
  value => {
    if (value !== null) localStorage.setItem('volt_theme', value)
    dark = true
    renderTheme()
    expect(themeButton()).toHaveAccessibleName('Theme: system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  }
)

it('follows live OS changes in system mode and cleans up its listener', () => {
  localStorage.setItem('volt_theme', 'system')
  const { unmount } = renderTheme()
  expect(screen.getByRole('status')).toHaveTextContent('light')
  changeSystem(true)
  expect(screen.getByRole('status')).toHaveTextContent('dark')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('volt_theme')).toBe('system')
  expect(themeButton()).toHaveAccessibleName('Theme: system')
  expect(document.documentElement.style.colorScheme).toBe('dark')
  changeSystem(false)
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem('volt_theme')).toBe('system')
  unmount()
  expect(listeners.size).toBe(0)
})

it.each(['light', 'dark'])(
  'persists %s, overrides OS changes and restores after remount',
  mode => {
    const { unmount } = renderTheme()
    chooseMode(mode)
    expect(localStorage.getItem('volt_theme')).toBe(mode)
    changeSystem(true)
    changeSystem(false)
    expect(document.documentElement).toHaveAttribute('data-theme', mode)
    unmount()
    renderTheme()
    expect(themeButton()).toHaveAccessibleName(`Theme: ${mode}`)
    expect(screen.getByRole('status')).toHaveTextContent(mode)
  }
)

it('resumes following the current OS preference when switching back to system', () => {
  renderTheme()
  chooseMode('light')
  changeSystem(true)
  chooseMode('system')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('volt_theme')).toBe('system')
})

it('continues working when storage reads and writes throw', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  renderTheme()
  expect(themeButton()).toHaveAccessibleName('Theme: system')
  chooseMode('dark')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})

it('continues working when access to localStorage itself is blocked', () => {
  jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage is blocked', 'SecurityError')
  })
  renderTheme()
  expect(themeButton()).toHaveAccessibleName('Theme: system')
  chooseMode('dark')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})

// Execute the actual HTML bootstrap without mounting React.
it.each([
  ['light', true, 'light'],
  ['dark', false, 'dark'],
  ['system', true, 'dark'],
  ['invalid', false, 'light'],
  [null, true, 'dark'],
])(
  'initializes before React: mode %s, OS dark %s',
  (mode, systemDark, expected) => {
    if (mode !== null) localStorage.setItem('volt_theme', mode)
    dark = systemDark as boolean
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeDefined()
    window.eval(script!)
    expect(document.documentElement).toHaveAttribute('data-theme', expected)
    expect(document.documentElement.style.colorScheme).toBe(expected)
  }
)

it('initializes from the OS before React even when storage is blocked', () => {
  dark = true
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  window.eval(html.match(/<script>([\s\S]*?)<\/script>/)![1])
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})

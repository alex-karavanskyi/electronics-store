import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface UseThemeMenuOptions {
  selectedIndex: number
  itemCount: number
}

export default function useThemeMenu({
  selectedIndex,
  itemCount,
}: UseThemeMenuOptions) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const initialFocus = useRef(0)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    itemRefs.current[initialFocus.current]?.focus()

    const dismiss = (event: Event) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('focusin', dismiss)
    }
  }, [open])

  function openMenu(index: number) {
    initialFocus.current = index
    setOpen(true)
  }

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function toggleMenu() {
    if (open) closeMenu()
    else openMenu(selectedIndex)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    event.stopPropagation()
    closeMenu()
  }

  function handleTriggerKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openMenu(event.key === 'ArrowDown' ? 0 : itemCount - 1)
  }

  function handleItemKeyDown(event: KeyboardEvent, index: number) {
    let nextIndex: number

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        itemRefs.current[index]?.click()
        return
      case 'Tab':
        // Let native Tab navigation continue from the trigger.
        closeMenu()
        return
      case 'ArrowDown':
        nextIndex = (index + 1) % itemCount
        break
      case 'ArrowUp':
        nextIndex = (index + itemCount - 1) % itemCount
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = itemCount - 1
        break
      default:
        return
    }

    event.preventDefault()
    itemRefs.current[nextIndex]?.focus()
  }

  return {
    open,
    menuId,
    containerRef,
    triggerRef,
    itemRefs,
    closeMenu,
    toggleMenu,
    handleKeyDown,
    handleTriggerKeyDown,
    handleItemKeyDown,
  }
}

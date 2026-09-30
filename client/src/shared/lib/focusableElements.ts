const isVisible = (element: HTMLElement): boolean => {
  if (element.closest('[hidden], [inert]')) return false

  for (
    let parent: HTMLElement | null = element;
    parent;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden')
      return false
  }

  return true
}

export const getFocusableElements = (dialog: HTMLElement): HTMLElement[] =>
  Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]'
    )
  ).filter(
    element =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      isVisible(element)
  )

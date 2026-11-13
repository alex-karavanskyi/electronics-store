import type { ComponentProps, ReactNode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'

function QueryAdapter({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <NuqsTestingAdapter
      hasMemory
      searchParams={location.search}
      onUrlUpdate={({ queryString, options }) => {
        navigate(
          {
            pathname: location.pathname,
            search: queryString,
            hash: location.hash,
          },
          {
            replace: options.history === 'replace',
            preventScrollReset: !options.scroll,
          }
        )
      }}
    >
      {children}
    </NuqsTestingAdapter>
  )
}

// MemoryRouter has no browser History API; browser tests cover the real v7 adapter.
export function CatalogRouter({
  children,
  ...props
}: ComponentProps<typeof MemoryRouter>) {
  return (
    <MemoryRouter {...props}>
      <QueryAdapter>{children}</QueryAdapter>
    </MemoryRouter>
  )
}

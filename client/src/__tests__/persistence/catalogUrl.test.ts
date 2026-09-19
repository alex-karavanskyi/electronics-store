import { parseFilters as parseCatalogUrl, clampPage } from '@/shared/filters/productFilters'
it.each([
  'page=0',
  'page=-2',
  'page=1.5',
  'page=Infinity',
  'page=9007199254740992',
  'page=invalid',
])('rejects invalid pagination: %s', value => {
  expect(parseCatalogUrl(new URLSearchParams(value)).page).toBe(1)
})
it('validates prices and sorting while retaining legitimate zero price', () => {
  expect(
    parseCatalogUrl(new URLSearchParams('price=0&sort=name-z'))
  ).toMatchObject({ filters: { price: 0 }, sort: 'name-z' })
  for (const price of ['', '-1', 'Infinity', 'invalid'])
    expect(
      parseCatalogUrl(new URLSearchParams({ price })).filters.price
    ).toBeNull()
  expect(parseCatalogUrl(new URLSearchParams('sort=invalid')).sort).toBe(
    'price-lowest'
  )
})
it('clamps pages to available results without changing the URL', () => {
  const params = new URLSearchParams('page=99&campaign=sale')
  expect(clampPage(parseCatalogUrl(params).page, 13, 6)).toBe(3)
  expect(clampPage(9, 0, 6)).toBe(1)
  expect(params.toString()).toBe('page=99&campaign=sale')
})

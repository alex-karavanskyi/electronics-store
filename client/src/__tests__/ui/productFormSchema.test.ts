import {
  createProductFormSchema,
  productFormSchema,
  getProductChanges,
} from '@/components/product/productFormSchema'

it('keeps untouched imported whitespace out of a price-only PATCH', () => {
  const original = {
    id: 'legacy',
    name: ' Phone ',
    price: 10,
    category: ' phones ',
    description: '',
    images: [],
    image: '',
  }
  const values = createProductFormSchema(original).parse({
    ...original,
    price: 11,
    imagesText: '',
  })
  expect(getProductChanges(values, original)).toEqual({ price: 11 })
})

it('allows unchanged legacy scalars but validates each modified field', () => {
  const original = {
    id: 'legacy',
    name: '',
    price: 1_000_000_001,
    category: 'c'.repeat(101),
    description: 'd'.repeat(10001),
    images: [],
    image: '',
  }
  const schema = createProductFormSchema(original)
  const values = schema.parse({ ...original, price: 11, imagesText: '' })
  expect(getProductChanges(values, original)).toEqual({ price: 11 })
  expect(
    schema.safeParse({ ...original, price: 11, imagesText: '', name: ' ' })
      .success
  ).toBe(false)
  expect(
    schema.safeParse({
      ...original,
      price: 11,
      imagesText: '',
      category: 'x'.repeat(101),
    }).success
  ).toBe(false)
  expect(
    schema.safeParse({
      ...original,
      price: 11,
      imagesText: '',
      description: 'x'.repeat(10001),
    }).success
  ).toBe(false)
  expect(
    schema.safeParse({ ...original, price: 1_000_000_002, imagesText: '' })
      .success
  ).toBe(false)
})

const fields = {
  name: 'Phone',
  price: 0,
  description: '',
  category: '',
  imagesText: '',
}
it('accepts zero and empty galleries, trims names and parses one HTTPS image per line', () => {
  expect(
    productFormSchema.parse({
      ...fields,
      name: ' Phone ',
      imagesText: ' https://example.com/a.png\n\nhttps://example.com/b.png ',
    })
  ).toMatchObject({ name: 'Phone', price: 0 })
})
it.each([
  { name: ' ' },
  { name: 'x'.repeat(201) },
  { price: NaN },
  { price: -1 },
  { price: 1_000_000_001 },
  { description: 'x'.repeat(10001) },
  { category: 'x'.repeat(101) },
  { imagesText: 'https://' },
  { imagesText: 'http://example.com/a.png' },
  { imagesText: 'https://user:password@example.com/a.png' },
  { imagesText: 'https://example.com/a\nhttps://example.com/a' },
  {
    imagesText: Array.from(
      { length: 21 },
      (_, i) => `https://example.com/${i}`
    ).join('\n'),
  },
])('rejects invalid product fields: %j', patch => {
  expect(productFormSchema.safeParse({ ...fields, ...patch }).success).toBe(
    false
  )
})
it('patches only changed fields and preserves an untouched imported gallery', () => {
  const original = {
    id: 'one',
    ...fields,
    image: '/legacy.png',
    images: ['/legacy.png'],
  }
  expect(
    getProductChanges(
      { ...fields, price: 12, imagesText: '/legacy.png' },
      original
    )
  ).toEqual({ price: 12 })
  expect(getProductChanges({ ...fields, imagesText: '' }, original)).toEqual({
    images: [],
  })
  expect(
    getProductChanges({ ...fields, imagesText: '/legacy.png' }, original)
  ).toEqual({})
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { productImagesSchema } from '../src/validation/productInput.js'

test('accepts uploaded raster images and rejects unsafe or oversized data', () => {
  assert.equal(
    productImagesSchema.safeParse(['data:image/png;base64,iVBORw0KGgo='])
      .success,
    true
  )
  for (const image of [
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,abcd',
    'data:image/png;base64,invalid!',
    'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024),
  ]) {
    assert.equal(productImagesSchema.safeParse([image]).success, false)
  }
})

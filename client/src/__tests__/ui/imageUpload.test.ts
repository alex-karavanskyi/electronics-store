import { readProductImages } from '@/components/product/imageUpload'

it('rejects unsupported files, excessive counts and oversized images', async () => {
  await expect(
    readProductImages(
      [new File(['svg'], 'x.svg', { type: 'image/svg+xml' })],
      []
    )
  ).rejects.toThrow('PNG')
  await expect(
    readProductImages(
      Array.from(
        { length: 21 },
        () => new File(['x'], 'x.png', { type: 'image/png' })
      ),
      []
    )
  ).rejects.toThrow('20')
  await expect(
    readProductImages(
      [
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'x.png', {
          type: 'image/png',
        }),
      ],
      []
    )
  ).rejects.toThrow('2 MB')
})

it('preserves existing images and deduplicates repeated selections', async () => {
  const file = new File(['abc'], 'x.png', { type: 'image/png' })
  expect(
    await readProductImages([file, file], ['https://example.com/old.png'])
  ).toEqual(['https://example.com/old.png', 'data:image/png;base64,YWJj'])
})

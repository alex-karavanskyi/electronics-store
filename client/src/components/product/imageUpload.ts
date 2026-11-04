export const maxImageBytes = 2 * 1024 * 1024
export const maxImageCharacters = Math.ceil(maxImageBytes / 3) * 4 + 20 * 40
export const rasterDataUrl =
  /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

export async function readProductImages(files: File[], existing: string[]) {
  if (files.length + existing.length > 20)
    throw new Error('Choose up to 20 images.')
  if (
    files.some(
      file => !/^image\/(png|jpeg|webp|gif)$/.test(file.type) || !file.size
    )
  )
    throw new Error('Choose PNG, JPEG, WebP or GIF images.')
  if (files.reduce((sum, file) => sum + file.size, 0) > maxImageBytes)
    throw new Error('Images must be no larger than 2 MB in total.')
  const uploaded = await Promise.all(
    files.map(
      file =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () =>
            reject(new Error('Could not read the image. Please try again.'))
          reader.onabort = () =>
            reject(new Error('Image reading was cancelled.'))
          reader.readAsDataURL(file)
        })
    )
  )
  const images = [...new Set([...existing, ...uploaded])]
  if (images.reduce((sum, image) => sum + image.length, 0) > maxImageCharacters)
    throw new Error('Images must be no larger than 2 MB in total.')
  return images
}

import { useEffect, useState } from 'react'
import { RiRobot2Line } from 'react-icons/ri'

import type { Product } from '@/shared/types/productSchema'
import Image from '@/shared/ui/Image'

import ProductThumbnails from './ProductThumbnails'
import styles from './ProductImages.module.scss'

type ProductImagesProps = {
  images: Product['images']
  productName: Product['name']
  onChatOpen?: () => void
}

const ProductImages = ({
  images = [],
  productName,
  onChatOpen,
}: ProductImagesProps) => {
  const [mainImage, setMainImage] = useState(images[0] ?? '')

  useEffect(() => {
    setMainImage(currentImage =>
      images.includes(currentImage) ? currentImage : (images[0] ?? '')
    )
  }, [images])

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          alt={productName}
          width={564}
          height={500}
          priority
          className={styles.product__images}
          src={mainImage}
        />
        {onChatOpen && (
          <button
            type="button"
            className={styles.chatButton}
            onClick={onChatOpen}
            title="Open AI Assistant"
            aria-label="Open chat"
          >
            <RiRobot2Line />
          </button>
        )}
      </div>
      <ProductThumbnails
        images={images}
        selectedImage={mainImage}
        onSelect={setMainImage}
      />
    </div>
  )
}

export default ProductImages

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

import type { Product } from '@/shared/types/productSchema'
import Image from '@/shared/ui/Image'

import styles from './ProductImages.module.scss'

type ProductThumbnailsProps = {
  images: Product['images']
  selectedImage: string
  onSelect: (image: string) => void
}

const galleryVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const ProductThumbnails = ({
  images,
  selectedImage,
  onSelect,
}: ProductThumbnailsProps) => {
  if (images.length <= 1) return null

  return (
    <motion.div
      className={styles['product__images-gallery']}
      initial="hidden"
      animate="visible"
      variants={galleryVariants}
    >
      {images.map((image, index) => {
        const isSelected = image === selectedImage

        return (
          <motion.button
            type="button"
            key={index}
            variants={itemVariants}
            onClick={() => onSelect(image)}
            className={[
              styles['product__images-thumbnail'],
              isSelected ? styles['product__images-thumbnail--active'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`Show product image ${index + 1}`}
            aria-pressed={isSelected}
          >
            <Image
              alt={`thumbnail ${index}`}
              width={100}
              height={75}
              src={image}
            />
          </motion.button>
        )
      })}
    </motion.div>
  )
}

export default ProductThumbnails

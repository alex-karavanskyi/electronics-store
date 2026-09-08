'use client'
import { useEffect, useState } from 'react'

import Image from 'next/image'

import { motion } from 'framer-motion'
import { RiRobot2Line } from 'react-icons/ri'

import { Product } from '@/shared/types/productsType'

import styles from './ProductImages.module.scss'

interface ProductImagesProps {
  images: Product['images']
  onChatOpen?: () => void
}

const ProductImages: React.FC<ProductImagesProps> = ({
  images = [],
  onChatOpen,
}) => {
  const [mainImage, setMainImage] = useState<string>(images[0] ?? '')

  useEffect(() => {
    if (images.length > 0) {
      setMainImage(images[0])
    }
  }, [images])

  const galleryVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          alt="main product image"
          width={564}
          height={500}
          priority
          className={styles.product__images}
          src={mainImage}
        />
        {onChatOpen && (
          <button
            className={styles.chatButton}
            onClick={onChatOpen}
            title="Open AI Assistant"
            aria-label="Open chat"
          >
            <RiRobot2Line />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <motion.div
          className={styles['product__images-gallery']}
          initial="hidden"
          animate="visible"
          variants={galleryVariants}
        >
          {images.map((image, index) => (
            <motion.button
              type={'button'}
              key={index}
              variants={itemVariants}
              onClick={() => setMainImage(image)}
              className={
                image === mainImage
                  ? [
                      styles['product__images-thumbnail'],
                      styles['product__images-thumbnail--active'],
                    ].join(' ')
                  : styles['product__images-thumbnail']
              }
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={image === mainImage}
            >
              <Image
                alt={`thumbnail ${index}`}
                width={100}
                height={75}
                src={image}
              />
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default ProductImages

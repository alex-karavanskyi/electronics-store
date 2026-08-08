'use client'
import { useEffect, useState } from 'react'

import Image from 'next/image'

import { motion } from 'framer-motion'
import { RiRobot2Line } from 'react-icons/ri'
import styled from 'styled-components'

import { Product } from '@/shared/types/productsType'

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
    <Container>
      <ImageWrapper>
        <Image
          alt="main product image"
          width={564}
          height={500}
          priority
          className="product__images"
          src={mainImage}
        />
        {onChatOpen && (
          <ChatButton
            onClick={onChatOpen}
            title="Open AI Assistant"
            aria-label="Open chat"
          >
            <RiRobot2Line />
          </ChatButton>
        )}
      </ImageWrapper>
      {images.length > 1 && (
        <motion.div
          className="product__images-gallery"
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
                  ? 'product__images-thumbnail product__images-thumbnail--active'
                  : 'product__images-thumbnail'
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
    </Container>
  )
}

const Container = styled.div`
  .product__images {
    width: 100%;
    border-radius: var(--radius);
    object-fit: cover;
  }

  .product__images-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.75rem;
    align-items: start;
    padding: 0.3rem;

    .product__images-thumbnail {
      padding: 0;
      cursor: pointer;
      border: 1px solid var(--line);
      border-radius: calc(var(--radius) - 0.2rem);
      background: var(--paper);
      overflow: hidden;
      aspect-ratio: 4 / 3;
      min-height: 0;
      position: relative;
      box-shadow: 0 3px 10px rgb(16 42 53 / 8%);
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.2s ease;
      }

      &:hover img {
        transform: scale(1.05);
      }
    }

    .product__images-thumbnail--active {
      border-color: var(--copper);
      box-shadow:
        0 0 0 2px var(--porcelain),
        0 0 0 4px var(--copper),
        0 8px 18px rgb(200 120 69 / 24%);
    }
  }
`

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: var(--radius);
  overflow: hidden;
`

const ChatButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid white;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;

  svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  &:hover {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }

  animation: pulse 3s infinite;

  @keyframes pulse {
    0% {
      box-shadow:
        0 0 0 0 rgba(59, 130, 246, 0.45),
        0 10px 30px rgba(59, 130, 246, 0.35);
    }

    70% {
      box-shadow:
        0 0 0 14px rgba(59, 130, 246, 0),
        0 10px 30px rgba(59, 130, 246, 0.35);
    }

    100% {
      box-shadow:
        0 0 0 0 rgba(59, 130, 246, 0),
        0 10px 30px rgba(59, 130, 246, 0.35);
    }
  }

  &:hover {
    animation: none;
  }

  @media (max-width: 640px) {
    width: 3rem;
    height: 3rem;
    top: 0.75rem;
    right: 0.75rem;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
`

export default ProductImages

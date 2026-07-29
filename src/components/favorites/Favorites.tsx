'use client'
import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'

import { removeFavorite } from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import { useDragAndDropFavorites } from '@/shared/hooks/useFavorites'
import { Product } from '@/shared/types/productsType'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import CartButton from '@/shared/ui/CartButton'
import ProductInfo from '@/shared/ui/ProductInfo'
import {
  containerCart,
  containerStyles,
} from '@/shared/ui/styles/containerStyles'
import { formatPrice } from '@/shared/utils/formatPrice'

const Favorites = () => {
  const { favorites_products } = useAppSelector(store => store.favorite)
  const dispatch = useAppDispatch()
  const { handleDragStart, handleDragOver, handleDragEnd } =
    useDragAndDropFavorites()

  const handleRemoveFromWishlist = (productId: Product['id']) => {
    dispatch(removeFavorite(productId))
  }

  return (
    <Container>
      <div className="favorites__breadcrumbs">
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className="favorites__title">Wishlist</h2>

      {favorites_products.length === 0 ? (
        <p className="favorites__empty">Your wishlist is empty</p>
      ) : (
        <motion.ul layout initial={false} className="favorites__list">
          <AnimatePresence>
            {favorites_products.map((product, index) => (
              <motion.li
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onDragOver={e => handleDragOver(e, index)}
              >
                <div
                  className="favorites__grid"
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <Image
                    alt={product.name}
                    width={700}
                    height={700}
                    src={product.image}
                    className="favorites__image"
                  />

                  <div className="favorites__info">
                    <ProductInfo
                      product={product}
                      variant="compact"
                      showHeader={true}
                      showPrice={false}
                      showFavorite={false}
                    />

                    <div className="favorites__price-cart">
                      <p className="product__info-price">
                        {formatPrice(product.price)}
                      </p>
                      <CartButton />
                    </div>

                    <button
                      onClick={() => handleRemoveFromWishlist(product.id)}
                      className="favorites__btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </Container>
  )
}

const Container = styled.div`
  ${containerStyles}
  padding-top: 1rem;

  .favorites__breadcrumbs {
    padding-left: 1rem;
  }

  .favorites__title {
    display: flex;
    justify-content: center;
    padding-bottom: 1rem;
    color: white;
    font-size: 2rem;
  }

  .favorites__empty {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1rem;
    padding-bottom: 1rem;
  }

  .favorites__list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .favorites__grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--clr-secondary-1);
    border-radius: var(--radius);
    padding: 1rem;
    cursor: grab;
    transition: background 0.2s;
  }

  .favorites__grid:hover {
    background: var(--clr-secondary-6);
  }

  .favorites__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: var(--radius);
    display: block;
  }

  .favorites__info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .favorites__price-cart {
    ${containerCart}
  }

  .product__info-price {
    color: var(--clr-primary-4);
    margin: 0;
  }

  .favorites__btn-delete {
    color: #ff6b6b;
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    font-size: 1rem;
    align-self: flex-start;
    padding: 0;
  }

  .favorites__btn-delete:hover {
    text-decoration: none;
  }

  @media ${device.mobile} {
    .favorites__grid {
      flex-direction: row;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .favorites__title {
      font-size: 2rem;
    }

    .favorites__empty {
      font-size: 1rem;
    }

    .favorites__image {
      width: 280px;
      height: auto;
      aspect-ratio: 1;
      flex-shrink: 0;
    }

    .favorites__info {
      flex: 1;
    }
  }

  @media ${device.desktop} {
    .favorites__breadcrumbs {
      padding-left: 0;
    }

    .favorites__title {
      font-size: 2.5rem;
    }

    .favorites__empty {
      font-size: 1.5rem;
    }
  }
`

export default Favorites

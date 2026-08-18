'use client'

import Image from 'next/image'
import Link from 'next/link'

import { FaSearch } from 'react-icons/fa'
import styled from 'styled-components'

import { device } from '@/shared/constants/device'
import { Product } from '@/shared/types/productsType'
import CartButton from '@/shared/ui/CartButton'
import ProductInfo from '@/shared/ui/ProductInfo'
import GridViewSkeleton from '@/shared/ui/skeletons/GridViewSkeleton'
import {
  containerCart,
  containerStyles,
} from '@/shared/ui/styles/containerStyles'

interface GridProducts {
  products: Product[]
  isLoading: boolean
}

const GridView: React.FC<GridProducts> = ({ products, isLoading }) => {
  return (
    <Container>
      <div className="grid__view-products" role="list">
        {isLoading && <GridViewSkeleton />}

        {!isLoading &&
          products.map(product => {
            const { id, image } = product

            return (
              <article key={id} className="grid__view-product" role="listitem">
                <div className="grid__view-products-images">
                  <Image
                    src={image}
                    alt={product.name}
                    width={470}
                    height={500}
                    priority
                    className="grid__view-images"
                  />

                  <Link
                    href={`/product/${id}`}
                    className="grid__view-products-link"
                  >
                    <FaSearch />
                  </Link>
                </div>

                <footer className="grid__view-footer">
                  <ProductInfo
                    product={product}
                    variant="compact"
                    showHeader
                    showPrice={false}
                  />

                  <div className="grid__view-price-cart">
                    <ProductInfo
                      product={product}
                      variant="compact"
                      showHeader={false}
                      showPrice
                    />
                    <CartButton product={product} />
                  </div>
                </footer>
              </article>
            )
          })}
      </div>
    </Container>
  )
}

const Container = styled.section`
  ${containerStyles};
  padding-inline: 1rem;

  .grid__view-products {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 2rem 1.25rem;
  }

  .grid__view-product {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
    border-radius: 1.2rem;
    background: var(--paper);
    box-shadow: 0 10px 35px rgba(16, 42, 53, 0.07);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
    overflow: hidden;

    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 22px 50px rgba(16, 42, 53, 0.13);
    }
  }

  .grid__view-products-images {
    position: relative;
    aspect-ratio: 4 / 4.6;
    background: var(--sand);
    border-radius: 0;
    overflow: hidden;

    &:hover {
      .grid__view-images {
        transform: scale(1.035);
      }

      .grid__view-products-link {
        opacity: 1;
      }
    }
  }

  .grid__view-images {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
    transition: transform 0.55s cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .grid__view-products-link {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);

    display: flex;
    align-items: center;
    justify-content: center;

    width: 3rem;
    height: 3rem;

    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);

    opacity: 0;
    cursor: pointer;

    box-shadow: 0 10px 30px rgba(16, 42, 53, 0.18);

    transition:
      opacity 0.3s ease,
      transform 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease;

    svg {
      font-size: 1.2rem;
      color: var(--navy);
    }

    &:hover {
      background: var(--copper);
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 12px 30px rgba(16, 42, 53, 0.25);
    }
  }

  .grid__view-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.15rem 1.25rem;
  }

  .grid__view-price-cart {
    ${containerCart}
  }

  .product__info-favorite-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--ink-soft);
    cursor: pointer;
  }

  @media ${device.desktop} {
    padding-inline: 0;
  }
`

export default GridView

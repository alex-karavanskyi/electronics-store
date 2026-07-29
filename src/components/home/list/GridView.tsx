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
                    <CartButton />
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
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .grid__view-product {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .grid__view-products-images {
    position: relative;
    background: #222;
    border-radius: var(--radius);
    overflow: hidden;

    &:hover {
      .grid__view-images {
        opacity: 0.5;
      }

      .grid__view-products-link {
        opacity: 1;
      }
    }
  }

  .grid__view-images {
    display: block;
    width: 100%;
    object-fit: cover;
    border-radius: inherit;
    transition: opacity 0.3s ease;
  }

  .grid__view-products-link {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);

    display: flex;
    align-items: center;
    justify-content: center;

    width: 2.75rem;
    height: 2.75rem;

    border-radius: 50%;
    background: rgba(234, 140, 46, 0.85);
    backdrop-filter: blur(8px);

    opacity: 0;
    cursor: pointer;

    box-shadow: 0 0 18px rgba(234, 140, 46, 0.35);

    transition:
      opacity 0.3s ease,
      transform 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease;

    svg {
      font-size: 1.2rem;
      color: #111827;
    }

    &:hover {
      background: #ea8c2e;
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 0 20px rgba(234, 140, 46, 0.6);
    }
  }

  .grid__view-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .grid__view-price-cart {
    ${containerCart}
  }

  .product__info-favorite-icon {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
  }

  @media ${device.desktop} {
    padding-inline: 0;
  }
`

export default GridView

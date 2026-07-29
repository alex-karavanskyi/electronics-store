'use client'
import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import styled from 'styled-components'

import { device } from '@/shared/constants/device'
import { Product } from '@/shared/types/productsType'
import CartButton from '@/shared/ui/CartButton'
import ProductInfo from '@/shared/ui/ProductInfo'
import ListViewSkeleton from '@/shared/ui/skeletons/ListViewSkeleton'
import {
  containerCart,
  containerStyles,
} from '@/shared/ui/styles/containerStyles'

interface ListProductsProps {
  products: Product[]
  isLoading: boolean
}

const ListView = ({ products, isLoading }: ListProductsProps) => {
  const [visibleCount, setVisibleCount] = useState<number>(7)
  const visibleProducts: Product[] = products.slice(0, visibleCount)

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 7)
  }

  return (
    <Container>
      <div className="list__view-products">
        {isLoading && <ListViewSkeleton />}
        {!isLoading &&
          visibleProducts.map(product => {
            const { id, image, description } = product
            return (
              <article className="list__view-article" key={id}>
                <Image
                  alt={product.name}
                  width={300}
                  height={200}
                  priority
                  src={image}
                  className="list__view-image"
                />

                <div className="list__view-products-info">
                  <ProductInfo
                    product={product}
                    variant="compact"
                    showHeader={true}
                    showPrice={false}
                  />
                  <div className="list__view-price-cart">
                    <ProductInfo
                      product={product}
                      variant="compact"
                      showHeader={false}
                      showPrice
                    />

                    <CartButton />
                  </div>

                  <p className="list__view-products-description">
                    {description.substring(0, 150)}...
                  </p>

                  <Link
                    href={`/product/${id}`}
                    className="list__view-products-btn-details"
                  >
                    Details
                  </Link>
                </div>
              </article>
            )
          })}
      </div>
      {!isLoading && visibleCount < products.length && (
        <button className="list__view-load-more-btn" onClick={handleLoadMore}>
          Load More
          <span>→</span>
        </button>
      )}
    </Container>
  )
}

const Container = styled.section`
  ${containerStyles}
  padding-bottom: 1rem;
  padding-left: 1rem;

  .list__view-products {
    display: grid;
    row-gap: 1.5rem;
    color: var(--clr-primary-4);
  }

  .list__view-article {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .list__view-products-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .list__view-image {
    width: 100%;
    max-width: 300px;
    height: 200px;
    object-fit: cover;
    border-radius: var(--radius);
  }

  .list__view-products-description {
    max-width: 45em;
    line-height: 1.6;
  }

  .list__view-products-btn-details {
    padding: 0.7rem 1.6rem;
    color: #f8fafc;
    text-transform: uppercase;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 1px;
    background: var(--clr-secondary-1);
    border: 1px solid rgba(234, 140, 46, 0.5);
    border-radius: 8px;
    width: max-content;
    backdrop-filter: blur(8px);
    cursor: pointer;
    transition: all 0.3s ease;

    box-shadow:
      0 0 0 rgba(234, 140, 46, 0),
      inset 0 0 0 var(--clr-secondary-6);
  }

  .list__view-products-btn-details:hover {
    background: var(--clr-list-hover-background);
    border-color: rgb(234, 140, 46);
    box-shadow: 0 0 7px var(--clr-list-hover-shadow);
    transform: translateY(-2px);
  }

  .list__view-products-btn-details:active {
    transform: translateY(0);
  }

  .list__view-load-more-btn {
    margin: 3rem auto 0;
    display: flex;
    align-items: center;
    justify-content: center;

    min-width: 180px;
    padding: 0.9rem 2.2rem;
    border: 1px solid rgba(234, 140, 46, 0.5);
    border-radius: 999px;
    background: var(--clr-secondary-1);
    backdrop-filter: blur(10px);
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;

    box-shadow:
      inset 0 1px 0 var(--clr-secondary-2),
      0 0 0 rgba(234, 140, 46, 0);

    transition:
      background 0.3s ease,
      border-color 0.3s ease,
      box-shadow 0.3s ease,
      transform 0.3s ease;
  }

  .list__view-load-more-btn:hover {
    background: var(--clr-list-hover-background);
    border-color: #ea8c2e;
    box-shadow: 0 0 18px var(--clr-list-hover-shadow);
    transform: translateY(-3px);
  }

  .list__view-load-more-btn {
    gap: 0.75rem;
  }

  .list__view-load-more-btn span {
    transition: transform 0.3s ease;
  }

  .list__view-load-more-btn:hover span {
    transform: translateX(5px);
  }

  .list__view-load-more-btn:active {
    transform: translateY(0);
  }

  .list__view-price-cart {
    ${containerCart}
  }

  .product__info-favorite-icon {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
  }

  @media ${device.mobile} {
    .list__view-article,
    .list__view-skeleton-card {
      flex-direction: row;
      column-gap: 2rem;
      align-items: center;
    }
  }

  @media ${device.desktop} {
    padding-left: 0;
  }
`

export default ListView

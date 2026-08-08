'use client'
import styled, { css } from 'styled-components'

import { Product } from '@/shared/types/productsType'
import { FavoriteButton } from '@/shared/ui'
import { formatPrice } from '@/shared/utils/formatPrice'

import { device } from '../constants/device'

interface ProductInfoProps {
  product: Product
  variant?: 'compact' | 'detailed'
  priceTag?: 'h5' | 'p'
  showHeader?: boolean
  showPrice?: boolean
  showFavorite?: boolean
  className?: string
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  variant = 'compact',
  priceTag = 'p',
  showHeader = true,
  showPrice = true,
  showFavorite = true,
  className = '',
}) => {
  const { name, price } = product
  const PriceTag = priceTag
  const isDetailed = variant === 'detailed'

  return (
    <Container className={className} $isDetailed={isDetailed}>
      {showHeader && (
        <Header $isDetailed={isDetailed}>
          <Name $isDetailed={isDetailed}>{name}</Name>
          {showFavorite && (
            <FavoriteButton
              product={product}
              classIcon="product__info-favorite-icon"
            />
          )}
        </Header>
      )}
      {showPrice && (
        <PriceTag className="product__info-price">
          {formatPrice(price)}
        </PriceTag>
      )}
    </Container>
  )
}

const baseStyles = css`
  color: var(--ink);
`

const Container = styled.div<{ $isDetailed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $isDetailed }) => ($isDetailed ? '0.75rem' : '0.5rem')};
  ${baseStyles}

  .product__info-price {
    margin: 0;
    color: var(--ink);
    font-family: inherit;
    font-size: ${({ $isDetailed }) =>
      $isDetailed ? 'clamp(1.125rem, 1.4vw, 1.375rem)' : '1rem'};
    font-weight: 650;
    letter-spacing: 0.01em;
    line-height: 1.2;
  }
`

const Header = styled.div<{ $isDetailed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $isDetailed }) => ($isDetailed ? '0.75rem' : '0.5rem')};
`

const Name = styled.h5<{ $isDetailed: boolean }>`
  font-weight: 500;
  color: var(--ink);
  font-size: ${({ $isDetailed }) => ($isDetailed ? '1.5rem' : '1.15rem')};
  line-height: 1.25;

  & + svg {
    flex: 0 0 auto;
  }

  @media ${device.laptop} {
    font-size: ${({ $isDetailed }) => ($isDetailed ? '2rem' : 'inherit')};
  }
`

export default ProductInfo

'use client'
import styled from 'styled-components'

import {
  FilterFields,
  FilterName,
  HandleFiltersFn,
} from '@/shared/types/productsType'
import { formatPrice } from '@/shared/utils/formatPrice'

interface PriceProps extends Pick<
  FilterFields,
  'price' | 'min_price' | 'max_price'
> {
  handleFilters: HandleFiltersFn
}

const Price: React.FC<PriceProps> = ({
  price,
  min_price,
  max_price,
  handleFilters,
}) => {
  const progress = ((price - min_price) / (max_price - min_price)) * 100

  const rangeStyle = {
    background: `linear-gradient(
    to right,
    var(--clr-primary-5) 0%,
    var(--clr-primary-5) ${progress}%,
    var(--clr-grey-7) ${progress}%,
    var(--clr-grey-7) 100%
  )`,
  }

  return (
    <Container>
      <div className="price__header">
        <h5>price</h5>
        <p>{formatPrice(price)}</p>
      </div>
      <input
        type="range"
        name="price"
        min={min_price}
        max={max_price}
        value={price}
        className="price__input"
        style={rangeStyle}
        onChange={e => handleFilters(FilterName.Price, Number(e.target.value))}
      />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  color: var(--ink-soft);

  .price__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h5 {
    font-size: 0.95rem;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  p {
    color: var(--navy);
    font-weight: 600;
  }

  .price__input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    outline: none;
  }

  .price__input::-webkit-slider-runnable-track {
    height: 6px;
    background: transparent;
  }

  .price__input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -6px;
    border-radius: 50%;
    background: var(--clr-primary-5);
    border: none;
    cursor: pointer;
  }
`

export default Price

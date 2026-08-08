'use client'
import styled from 'styled-components'

import { ClearButton, Price, Search } from '@/components/home'
import {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from '@/shared/types/productsType'

interface FiltersProps extends FilterFields {
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
}

const Filters: React.FC<FiltersProps> = ({
  price,
  min_price,
  max_price,
  handleFilters,
  handleClearButton,
}) => {
  return (
    <Container>
      <SectionTitle>Search & price</SectionTitle>
      <Search handleFilters={handleFilters} />
      <Price
        price={price}
        min_price={min_price}
        max_price={max_price}
        handleFilters={handleFilters}
      />
      <ClearButton handleClearButton={handleClearButton} />
    </Container>
  )
}

const Container = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 1.1rem;
  background: #f7f8f5;
`

const SectionTitle = styled.h5`
  color: var(--navy);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
`

export default Filters

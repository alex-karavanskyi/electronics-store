'use client'
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import SkeletonList from '@/shared/ui/skeletons/CategorySkeleton'
import { getUniqueValues } from '@/shared/utils/formatPrice'

interface CategoryProps {
  selectedCategories: string[]
  handleFilters: HandleFiltersFn
  loading: boolean
}

const Category: React.FC<CategoryProps> = ({
  selectedCategories,
  handleFilters,
  loading,
}) => {
  const { all_products } = useAppSelector(store => store.filter)
  const categories = getUniqueValues(all_products, 'category')

  return (
    <Container>
      {loading ? (
        <SkeletonList />
      ) : (
        categories.map(c => {
          const isActive = selectedCategories.includes(c)

          return (
            <CategoryLabel
              key={c}
              data-cy="category"
              $isActive={isActive}
              whileTap={{ scale: 0.95 }}
            >
              <CategoryInput
                type="checkbox"
                checked={isActive}
                onChange={() => handleFilters(FilterName.Category, c)}
              />
              <CheckboxIndicator $isActive={isActive} />
              <LabelText>{c}</LabelText>
            </CategoryLabel>
          )
        })
      )}
    </Container>
  )
}

const Container = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;

  @media ${device.tablet} {
    justify-content: center;
  }
`

const CategoryLabel = styled(motion.label)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-soft);
  font: 600 0.9rem var(--font-main);
  border-radius: 1rem;
  cursor: pointer;
  transition: color 0.25s ease;

  &:hover {
    color: ${({ $isActive }) =>
      $isActive ? 'var(--clr-primary-5)' : '#e65c00'};
  }
`

const CategoryInput = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`

const CheckboxIndicator = styled.span<{ $isActive: boolean }>`
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 2px solid
    ${({ $isActive }) =>
      $isActive ? 'var(--clr-primary-5)' : 'var(--clr-grey-4)'};

  border-radius: 0.4rem;

  background-color: ${({ $isActive }) =>
    $isActive ? 'var(--clr-primary-5)' : 'transparent'};

  box-shadow: ${({ $isActive }) =>
    $isActive ? '0 0 0 6px rgba(255, 104, 10, 0.15)' : 'none'};

  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.2s ease;

  ${CategoryLabel}:hover & {
    border-color: #e65c00;
    transform: scale(1.05);
  }

  &::after {
    content: '';
    width: 0.45rem;
    height: 0.25rem;

    border-left: 2px solid #fff;
    border-bottom: 2px solid #fff;

    opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
    transform: rotate(-45deg) scale(${({ $isActive }) => ($isActive ? 1 : 0)});

    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
`

const LabelText = styled.span`
  text-transform: capitalize;
`

export default Category

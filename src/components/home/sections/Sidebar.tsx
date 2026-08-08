'use client'
import { useState } from 'react'

import styled, { css } from 'styled-components'

import { Category, ClearButton, Price, Search, Sort } from '@/components/home'
import {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from '@/shared/types/productsType'

interface SidebarProps extends FilterFields {
  isSidebarOpen: boolean
  loading: boolean
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
  setIsSidebarOpen: (value: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  category,
  price,
  loading,
  min_price,
  max_price,
  handleFilters,
  handleClearButton,
  setIsSidebarOpen,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false)

  return (
    <>
      <Conteiner>
        <MobileFiltersToggle onClick={() => setIsSidebarOpen(true)}>
          Filters
        </MobileFiltersToggle>
        <HorizontalLine />
        <MobileFiltersToggle onClick={() => setIsSortOpen(true)}>
          Sort
        </MobileFiltersToggle>
      </Conteiner>

      {isSidebarOpen && (
        <SidebarOverlay onClick={() => setIsSidebarOpen(false)}>
          <SidebarContent side="right" onClick={e => e.stopPropagation()}>
            <Category
              selectedCategories={category}
              handleFilters={handleFilters}
              loading={loading}
            />
            <Search handleFilters={handleFilters} />
            <Price
              price={price}
              min_price={min_price}
              max_price={max_price}
              handleFilters={handleFilters}
            />
            <ClearButton handleClearButton={handleClearButton} />
          </SidebarContent>
        </SidebarOverlay>
      )}

      {isSortOpen && (
        <SidebarOverlay onClick={() => setIsSortOpen(false)}>
          <SidebarContent side="left" onClick={e => e.stopPropagation()}>
            <Sort handleFilters={handleFilters} />
          </SidebarContent>
        </SidebarOverlay>
      )}
    </>
  )
}

const Conteiner = styled.aside`
  display: flex;
  justify-content: space-evenly;
  padding-top: 1rem;
  padding-bottom: 1rem;
`
const HorizontalLine = styled.hr`
  width: 50%;
  height: 1px;
  background-color: black;
  border: none;
  margin: 0.75rem 0;
`

const MobileFiltersToggle = styled.button`
  background-color: #111;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`

const SidebarOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
`

const SidebarContent = styled.div<{ side: 'left' | 'right' }>`
  ${props => props.side}: 0;
  position: fixed;
  top: var(--navbar-height);
  width: min(320px, 85vw);
  height: 100%;
  background: var(--gradient-navbar-footer-bg);
  padding: 1rem 1.25rem 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;

  ${({ side }) =>
    side === 'right' &&
    css`
      && label,
      && .price__header h5,
      && .price__header p {
        color: rgba(255, 255, 255, 0.88);
      }
    `}

  ${({ side }) =>
    side === 'left' &&
    css`
      && .sort__title,
      && .sort__label {
        color: rgba(255, 255, 255, 0.88);
      }
    `}
`

export default Sidebar

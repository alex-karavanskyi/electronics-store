'use client'
import { RxCross2 } from 'react-icons/rx'
import styled from 'styled-components'

import { useAppSelector } from '@/redux/hooks'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'

interface SearchProps {
  handleFilters: HandleFiltersFn
}

const Search: React.FC<SearchProps> = ({ handleFilters }) => {
  const clearSearch = () => handleFilters(FilterName.Text, '')

  const text = useAppSelector(state => state.filter.filters.text)

  return (
    <Container>
      <input
        data-cy="search"
        type="search"
        name="text"
        placeholder="Search"
        className="search__input"
        value={text}
        onChange={e => handleFilters(FilterName.Text, e.target.value)}
      />
      <button
        type="button"
        className="search__clear"
        onClick={clearSearch}
        aria-label="Clear search"
      >
        <RxCross2 size={18} />
      </button>
    </Container>
  )
}

const Container = styled.div`
  position: relative;

  .search__input {
    width: 100%;
    padding: 0.8rem 3.25rem 0.8rem 1rem;
    border: 1px solid var(--clr-secondary-3);
    border-radius: 77px;
    background: white;
    color: var(--ink);
    letter-spacing: var(--spacing);
    outline: none;
    box-shadow: inset 0 1px 0 var(--clr-secondary-2);
    transition: var(--transition);

    &::-webkit-search-cancel-button {
      display: none;
      -webkit-appearance: none;
    }
  }

  .search__input::placeholder {
    color: #8a9499;
    text-transform: capitalize;
  }

  .search__input:hover,
  .search__input:focus {
    border-color: var(--clr-secondary-7);
    background: white;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
  }

  .search__clear {
    position: absolute;
    top: 50%;
    right: 0.8rem;
    transform: translateY(-50%);

    display: flex;
    align-items: center;
    justify-content: center;

    width: 30px;
    height: 30px;

    border: none;
    border-radius: 50%;
    background: var(--clr-secondary-2);
    color: var(--ink-soft);
    cursor: pointer;

    transition:
      background 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
  }

  .search__clear:hover {
    background: var(--clr-primary-5);
    color: white;
    transform: translateY(-50%) scale(1.08);
  }

  .search__clear:active {
    transform: translateY(-50%) scale(0.94);
  }

  .search__clear svg {
    pointer-events: none;
  }
`

export default Search

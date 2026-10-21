import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FilterFields, FilterName, HandleFiltersFn } from './filterTypes'
import { formatPrice } from '@/shared/utils/formatPrice'
import styles from './Price.module.scss'

interface PriceProps extends Pick<
  FilterFields,
  'price' | 'minPrice' | 'min_price' | 'max_price'
> {
  handleFilters: HandleFiltersFn
}

const Price: React.FC<PriceProps> = ({
  price,
  minPrice,
  min_price,
  max_price,
  handleFilters,
}) => {
  const upper = Math.max(min_price, Math.min(max_price, price))
  const lower = Math.max(min_price, Math.min(upper, minPrice ?? min_price))
  const [draft, setDraft] = useState<{
    name: FilterName
    value: string
  } | null>(null)
  const percent = (value: number) =>
    max_price > min_price
      ? ((value - min_price) / (max_price - min_price)) * 100
      : 0
  const commit = (name: FilterName, raw: string) => {
    if (raw.trim() && Number.isFinite(Number(raw))) {
      const value =
        name === FilterName.MinPrice
          ? Math.max(min_price, Math.min(upper, Number(raw)))
          : Math.max(lower, Math.min(max_price, Number(raw)))
      handleFilters(name, value)
    }
    setDraft(null)
  }
  const bounds = [
    {
      name: FilterName.MinPrice,
      label: 'Minimum price',
      value: lower,
      min: min_price,
      max: upper,
    },
    {
      name: FilterName.Price,
      label: 'Maximum price',
      value: upper,
      min: lower,
      max: max_price,
    },
  ]

  return (
    <div className={styles.container} role="group" aria-label="Price range">
      <div className={styles.fields}>
        {bounds.map((bound, index) => (
          <div className={styles.field} key={bound.name}>
            {index === 1 && (
              <span className={styles.separator} aria-hidden="true">
                –
              </span>
            )}
            <input
              type="number"
              inputMode="decimal"
              aria-label={bound.label}
              min={bound.min}
              max={bound.max}
              step="any"
              value={draft?.name === bound.name ? draft.value : bound.value}
              onChange={event =>
                setDraft({ name: bound.name, value: event.target.value })
              }
              onBlur={event => commit(bound.name, event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') setDraft(null)
              }}
            />
          </div>
        ))}
      </div>
      <div
        className={styles.slider}
        style={
          {
            '--range-start': `${percent(lower)}%`,
            '--range-end': `${percent(upper)}%`,
          } as CSSProperties
        }
      >
        <div className={styles.track} />
        {bounds.map(bound => (
          <input
            key={bound.name}
            type="range"
            name={bound.name}
            aria-label={bound.label}
            aria-valuetext={formatPrice(bound.value)}
            aria-valuemin={bound.min}
            aria-valuemax={bound.max}
            min={min_price}
            max={max_price}
            step="1"
            value={bound.value}
            disabled={max_price <= min_price}
            className={styles.handle}
            style={{
              zIndex:
                bound.name === FilterName.MinPrice && lower === max_price
                  ? 3
                  : undefined,
            }}
            onChange={event => commit(bound.name, event.target.value)}
          />
        ))}
      </div>
    </div>
  )
}

export default Price

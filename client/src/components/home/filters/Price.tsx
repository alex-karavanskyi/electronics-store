import { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
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
    name: FilterName.Price | FilterName.MinPrice
    value: string
  } | null>(null)

  const commit = (
    name: FilterName.Price | FilterName.MinPrice,
    raw: string
  ) => {
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
  ] as const

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
      <Slider.Root
        className={styles.slider}
        min={min_price}
        max={max_price}
        step={1}
        preserveThumbOrder
        value={[lower, upper]}
        disabled={max_price <= min_price}
        onValueChange={([minimum, maximum]) => {
          if (minimum !== lower) handleFilters(FilterName.MinPrice, minimum)
          if (maximum !== upper) handleFilters(FilterName.Price, maximum)
          setDraft(null)
        }}
      >
        <Slider.Track className={styles.track}>
          <Slider.Range className={styles.range} />
        </Slider.Track>
        {bounds.map(bound => (
          <Slider.Thumb
            key={bound.name}
            aria-label={bound.label}
            aria-valuetext={formatPrice(bound.value)}
            aria-valuemin={bound.min}
            aria-valuemax={bound.max}
            className={styles.handle}
            onKeyDown={event => {
              if (max_price <= min_price) return
              if (event.key !== 'Home' && event.key !== 'End') return
              event.preventDefault()
              commit(
                bound.name,
                String(event.key === 'Home' ? bound.min : bound.max)
              )
            }}
          />
        ))}
      </Slider.Root>
    </div>
  )
}

export default Price

import { FiArrowUpRight } from 'react-icons/fi'

import styles from './Slider.module.scss'

const highlights = [
  { label: 'Catalogue', value: 'Curated technology' },
  { label: 'Selection', value: '12 product categories' },
  { label: 'Support', value: 'Official warranty' },
] as const

const HighlightsBar = () => (
  <div className={styles['hero__stay-bar']} aria-label="Store highlights">
    {highlights.map(({ label, value }) => (
      <div key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    ))}
    <a href="#collection" aria-label="Browse all products">
      <FiArrowUpRight />
    </a>
  </div>
)

export default HighlightsBar

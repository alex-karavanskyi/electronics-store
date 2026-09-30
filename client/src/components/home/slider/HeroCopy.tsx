import { FiArrowDownRight } from 'react-icons/fi'

import styles from './Slider.module.scss'

const HeroCopy = () => (
  <div className={styles.hero__copy}>
    <p className={styles.hero__eyebrow}>Technology · thoughtfully selected</p>
    <h1>
      Better technology
      <em> for everyday life.</em>
    </h1>
    <p className={styles.hero__intro}>
      Reliable devices for work, home and entertainment — selected for
      performance, quality and long-term value.
    </p>
    <a href="#collection" className={styles.hero__cta}>
      Browse the catalogue <FiArrowDownRight />
    </a>
  </div>
)

export default HeroCopy

import { useState } from 'react'

import { HandleClearButtonFn } from '@/shared/types/productsType'

import styles from './ClearButton.module.scss'

interface ClearButtonProps {
  handleClearButton: HandleClearButtonFn
}

const ClearButton: React.FC<ClearButtonProps> = ({ handleClearButton }) => {
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    setClicked(true)
    handleClearButton()
    setTimeout(() => setClicked(false), 300)
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={[styles.clear__btn, clicked ? styles.animate : '']
          .filter(Boolean)
          .join(' ')}
        onClick={handleClick}
      >
        clear filters
      </button>
    </div>
  )
}

export default ClearButton

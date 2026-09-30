import { useEffect, useRef, useState } from 'react'

import { HandleClearButtonFn } from './filterTypes'

import styles from './ClearButton.module.scss'

interface ClearButtonProps {
  handleClearButton: HandleClearButtonFn
}

const ClearButton: React.FC<ClearButtonProps> = ({ handleClearButton }) => {
  const [clicked, setClicked] = useState(false)

  const animationTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => clearTimeout(animationTimer.current)
  }, [])

  const handleClick = () => {
    clearTimeout(animationTimer.current)
    setClicked(true)
    animationTimer.current = setTimeout(() => {
      setClicked(false)
      animationTimer.current = undefined
    }, 300)
    handleClearButton()
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

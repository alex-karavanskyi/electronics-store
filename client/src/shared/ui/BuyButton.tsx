import styles from './BuyButton.module.scss'

type ButtonSize = 'sm' | 'md' | 'lg'

interface BuyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize
  fullWidth?: boolean
}

const BuyButton: React.FC<BuyButtonProps> = ({
  children = 'Buy now',
  size = 'md',
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <button
      {...props}
      className={[
        styles.button,
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}

export default BuyButton

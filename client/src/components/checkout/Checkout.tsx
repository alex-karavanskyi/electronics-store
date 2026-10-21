import { Link } from 'react-router-dom'
import { HiArrowLeft } from 'react-icons/hi2'
import EmptyCart from '@/components/cart/EmptyCart'
import { useAppSelector } from '@/redux/hooks'
import { selectCartQuantity } from '@/redux/features/cartSlice'
import CheckoutFields from './CheckoutFields'
import CheckoutOrder from './CheckoutOrder'
import useCheckoutForm from './useCheckoutForm'
import styles from './Checkout.module.scss'

export default function Checkout() {
  const items = useAppSelector(state => state.cart.items)
  const quantity = useAppSelector(selectCartQuantity)
  const {
    register,
    errors,
    isValid,
    isSubmitting,
    submitted,
    formRef,
    onSubmit,
    onChange,
  } = useCheckoutForm(items.length > 0)

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/">
        <HiArrowLeft /> Continue shopping
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>ONE LAST STEP</p>
        <h1>Checkout</h1>
        <p>Your next upgrade is almost yours.</p>
      </header>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <EmptyCart />
        </div>
      ) : (
        <form
          className={styles.layout}
          ref={formRef}
          noValidate
          onSubmit={onSubmit}
          onChange={onChange}
        >
          <CheckoutFields register={register} errors={errors} />
          <CheckoutOrder
            items={items}
            quantity={quantity}
            isValid={isValid}
            isSubmitting={isSubmitting}
            submitted={submitted}
          />
        </form>
      )}
    </div>
  )
}

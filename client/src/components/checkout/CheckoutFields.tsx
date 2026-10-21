import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CheckoutFormData } from './checkoutSchema'
import CheckoutField from './CheckoutField'
import CheckoutSection from './CheckoutSection'
import styles from './CheckoutFields.module.scss'

interface CheckoutFieldsProps {
  register: UseFormRegister<CheckoutFormData>
  errors: FieldErrors<CheckoutFormData>
}

export default function CheckoutFields({ register, errors }: CheckoutFieldsProps) {
  return (
    <div className={styles.form}>
      <CheckoutSection number="01" title="Contact details" initiallyOpen>
        <CheckoutField
          label="Full name"
          autoComplete="name"
          placeholder="Alex Morgan"
          registration={register('name')}
          error={errors.name?.message}
        />
        <CheckoutField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 0000"
          registration={register('phone')}
          error={errors.phone?.message}
        />
        <CheckoutField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="alex@example.com"
          registration={register('email')}
          error={errors.email?.message}
          wide
        />
      </CheckoutSection>
      <CheckoutSection number="02" title="Delivery details">
        <CheckoutField
          label="Street address"
          autoComplete="street-address"
          placeholder="Street and house number"
          registration={register('address')}
          error={errors.address?.message}
          wide
        />
        <CheckoutField
          label="City"
          autoComplete="address-level2"
          placeholder="City"
          registration={register('city')}
          error={errors.city?.message}
        />
        <CheckoutField
          label="Postal code"
          autoComplete="postal-code"
          placeholder="Postal code"
          registration={register('postalCode')}
          error={errors.postalCode?.message}
        />
        <CheckoutField
          label="Country"
          autoComplete="country-name"
          placeholder="Country"
          registration={register('country')}
          error={errors.country?.message}
          wide
        />
      </CheckoutSection>
      <CheckoutSection number="03" title="Delivery time">
        <label className={styles.wide}>
          Preferred delivery time
          <select {...register('deliveryTime')}>
            <option value="anytime">Any time during the day</option>
            <option value="morning">Morning · 9:00–12:00</option>
            <option value="afternoon">Afternoon · 12:00–18:00</option>
          </select>
        </label>
        <p className={styles.wide}>
          Delivery availability and timing will be confirmed with your order.
        </p>
      </CheckoutSection>
      <CheckoutSection number="04" title="Payment method">
        <label className={styles.wide}>
          Payment
          <select {...register('payment')}>
            <option value="delivery">Pay on delivery</option>
          </select>
        </label>
        <p className={styles.wide}>No payment is collected online.</p>
      </CheckoutSection>
      <CheckoutSection number="05" title="Order notes">
        <label className={styles.wide}>
          Comment (optional)
          <textarea
            {...register('comment')}
            aria-invalid={Boolean(errors.comment)}
            aria-describedby={
              errors.comment ? 'checkout-comment-error' : undefined
            }
            rows={3}
            maxLength={1000}
            placeholder="Anything we should know about your delivery?"
          />
        </label>
        {errors.comment && (
          <span
            id="checkout-comment-error"
            className={styles.error}
            aria-live="polite"
          >
            {errors.comment.message}
          </span>
        )}
      </CheckoutSection>
      <label className={styles.callback}>
        <input type="checkbox" {...register('callback')} /> Call me to confirm my
        order
      </label>
    </div>
  )
}

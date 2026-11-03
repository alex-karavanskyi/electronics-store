import { useRef } from 'react'
import { SignInButton } from '@clerk/react'
import { Link } from 'react-router-dom'
import { useAccess } from '@/shared/auth/useAccess'
import { useMyProducts } from '@/shared/hooks/useMyProducts'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import RequestError from '@/shared/ui/RequestError'
import ProductManagement from './ProductManagement'
import styles from './MyProducts.module.scss'

export default function MyProducts() {
  const access = useAccess()
  return (
    <section className={styles.container} aria-labelledby="my-products-title">
      <Breadcrumbs name="My products" />
      <h1 id="my-products-title" tabIndex={-1}>
        My products
      </h1>
      {access.status === 'authenticated' ? (
        <PersonalList key={access.userId} />
      ) : access.status === 'guest' ? (
        <div className={styles.notice}>
          <p>Sign in to publish products and manage your listings.</p>
          <SignInButton mode="modal">
            <button type="button">Sign in or create account</button>
          </SignInButton>
        </div>
      ) : (
        <p role="status">
          {access.status === 'loading'
            ? 'Loading account...'
            : 'Sign in is currently unavailable. Please try again later.'}
        </p>
      )}
    </section>
  )
}

function PersonalList() {
  const query = useMyProducts()
  const list = useRef<HTMLDivElement>(null)
  return (
    <>
      <p>Your published products are visible to everyone in the catalog.</p>
      <ProductManagement />
      <div ref={list} tabIndex={-1} aria-label="Your products">
        {query.isPending ? (
          <p role="status">Loading your products...</p>
        ) : query.isError ? (
          <RequestError
            message="Unable to load your products. Please try again."
            onRetry={() => {
              void query.refetch()
            }}
            isRetrying={query.isFetching}
          />
        ) : query.data.length === 0 ? (
          <p>You haven't published any products yet.</p>
        ) : (
          <ul className={styles.list}>
            {query.data.map(product => (
              <li key={product.id} className={styles.item}>
                {product.image && (
                  <img src={product.image} alt="" loading="lazy" />
                )}
                <div className={styles.content}>
                  <h2>
                    <Link to={'/product/' + encodeURIComponent(product.id)}>
                      {product.name}
                    </Link>
                  </h2>
                  <p>
                    ${product.price.toFixed(2)}
                    {product.category ? ` · ${product.category}` : ''}
                  </p>
                  <ProductManagement
                    product={product}
                    onDeleted={() => {}}
                    returnFocusRef={list}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

import { useRef, useState } from 'react'
import { SignInButton } from '@clerk/react'
import { Link } from 'react-router-dom'
import { useAccess } from '@/shared/auth/useAccess'
import { useAdminProducts } from '@/shared/hooks/useAdminProducts'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import RequestError from '@/shared/ui/RequestError'
import ProductManagement from './ProductManagement'
import ProductNotification from './ProductNotification'
import styles from './MyProducts.module.scss'
import adminStyles from './AdminProducts.module.scss'

export default function AdminProducts() {
  const access = useAccess()
  return (
    <section
      className={styles.container}
      aria-labelledby="admin-products-title"
    >
      <Breadcrumbs name="Admin panel" />
      <h1 id="admin-products-title">Admin panel</h1>
      {access.status === 'authenticated' ? (
        access.isAdmin ? (
          <ModerationList key={access.userId} />
        ) : (
          <p role="alert">
            Administrator access is required to moderate publications.
          </p>
        )
      ) : access.status === 'guest' ? (
        <div className={styles.notice}>
          <p>Sign in with an administrator account to continue.</p>
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

function ModerationList() {
  const query = useAdminProducts()
  const [search, setSearch] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const term = search.trim().toLowerCase()
  const rows =
    query.data?.filter(({ product, ownerId }) =>
      [product.name, product.id, ownerId ?? ''].some(value =>
        value.toLowerCase().includes(term)
      )
    ) ?? []
  return (
    <>
      <p>
        Publications appear in the catalog immediately. You can edit or remove
        any product here.
      </p>
      <div className={adminStyles.search}>
        <label htmlFor="publication-search">Search publications</label>
        <input
          id="publication-search"
          type="search"
          placeholder="Name, product ID or owner ID"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>
      <div ref={list} tabIndex={-1} aria-label="Publications">
        {query.isPending ? (
          <p role="status">Loading publications...</p>
        ) : query.isError ? (
          <RequestError
            message="Unable to load publications. Please try again."
            onRetry={() => {
              void query.refetch()
            }}
            isRetrying={query.isFetching}
          />
        ) : !query.data.length ? (
          <p>No publications yet.</p>
        ) : !rows.length ? (
          <p>No publications match your search.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map(({ product, ownerId, createdAt, notification }) => (
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
                  <p>${product.price.toFixed(2)}</p>
                  <dl className={adminStyles.metadata}>
                    <div>
                      <dt>Product ID</dt>
                      <dd>{product.id}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{ownerId ?? 'Original catalog'}</dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>
                        {createdAt ? (
                          <time dateTime={createdAt}>
                            {new Date(createdAt).toLocaleString()}
                          </time>
                        ) : (
                          'Date unavailable'
                        )}
                      </dd>
                    </div>
                  </dl>
                  <ProductNotification
                    id={product.id}
                    notification={notification}
                  />
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

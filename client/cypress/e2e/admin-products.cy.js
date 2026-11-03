// The real app is loaded with test-only Clerk and HTTP boundaries; no live data.
const entry = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script><script type="module" src="/cypress/fixtures/my-products-entry.tsx"></script></body></html>`
const phone = {
  id: 'foreign-one',
  name: 'Community phone',
  price: 99,
  description: '',
  category: 'phones',
  images: [],
  image: '',
}

for (const width of [1280, 390, 320]) {
  it(`moderates publications and revokes access at ${width}px`, () => {
    cy.viewport(width, 900)
    let rejectDelete = true
    let rows = [
      {
        product: phone,
        ownerId: 'user_author_of_this_publication',
        createdAt: '2026-10-31T10:00:00.000Z',
        notification: {
          channel: 'telegram',
          status: 'failed',
          attempts: 4,
          errorCode: 'network',
          nextAttemptAt: null,
          leaseUntil: null,
        },
      },
      {
        product: { ...phone, id: 'legacy', name: 'Original phone' },
        ownerId: null,
        createdAt: null,
      },
    ]
    cy.intercept('GET', '/__admin-products-test', {
      headers: { 'content-type': 'text/html' },
      body: entry,
    })
    cy.intercept('GET', '**/node_modules/.vite/deps/@clerk_react.js*', {
      headers: { 'content-type': 'application/javascript' },
      body: `import React from '/node_modules/.vite/deps/react.js'; export const SignInButton = ({children}) => children; export const UserButton = () => React.createElement('button', { 'aria-label': 'Account', style: { width: 32, height: 32 } }, 'A');`,
    })
    cy.intercept({ pathname: '/api/**' }, req => {
      const path = new URL(req.url).pathname
      if (path.includes('/favorites'))
        return req.reply({ ids: [], revision: 0 })
      if (req.method === 'POST' && path.endsWith('/notification/retry')) {
        rows[0].notification = {
          ...rows[0].notification,
          status: 'sent',
          errorCode: null,
        }
        return req.reply({ status: 'sent' })
      }
      if (req.method === 'PATCH') {
        rows[0] = { ...rows[0], product: { ...rows[0].product, ...req.body } }
        return req.reply(rows[0].product)
      }
      if (req.method === 'DELETE') {
        if (rejectDelete)
          return req.reply({
            statusCode: 503,
            body: { error: 'Temporarily unavailable' },
          })
        rows = rows.filter(row => !path.endsWith('/' + row.product.id))
        return req.reply({ statusCode: 204 })
      }
      if (path === '/api/admin/products') return req.reply(rows)
      if (path === '/api/me/products') return req.reply([])
      if (path === '/api/products')
        return req.reply(rows.map(row => row.product))
      return req.reply(rows[0]?.product ?? {})
    })
    cy.visit('/__admin-products-test', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.sessionStorage.clear()
      },
    })
    cy.contains('h1', 'Admin panel', { timeout: 20000 }).should('be.visible')
    cy.contains('h2', 'Community phone').should('be.visible')
    cy.contains('dd', 'Original catalog').should('be.visible')
    cy.contains('Telegram: failed').should('be.visible')
    cy.contains('Telegram: not requested').should('be.visible')
    cy.contains('button', 'Retry notification').click()
    cy.contains('Telegram: sent').should('be.visible')
    cy.contains('button', 'Retry notification').should('not.exist')
    cy.get('nav[aria-label="Main navigation"]').within(() => {
      cy.contains('summary', 'Products').click()
      cy.contains('a', 'Admin panel')
        .should('be.visible')
        .then(link => {
          const bounds = link[0].getBoundingClientRect()
          expect(bounds.left).to.be.at.least(0)
          expect(bounds.right).to.be.at.most(width)
        })
      cy.contains('summary', 'Products')
        .trigger('keydown', { key: 'Escape' })
        .should('be.focused')
      cy.get('details').should('not.have.attr', 'open')
      cy.contains('summary', 'Products').click()
      cy.contains('a', 'My products').click()
    })
    cy.contains('h1', 'My products').should('be.visible')
    cy.get('nav[aria-label="Main navigation"]')
      .contains('summary', 'Products')
      .click()
    cy.get('nav[aria-label="Main navigation"]')
      .contains('a', 'Admin panel')
      .click()
    cy.contains('h1', 'Admin panel').should('be.visible')
    cy.get('#publication-search').type('user_author')
    cy.contains('h2', 'Original phone').should('not.exist')
    cy.contains('button', 'Edit Product').click()
    cy.get('input[name="name"]')
      .should('be.focused')
      .clear()
      .type('Moderated phone')
    cy.contains('button', 'Save changes').click()
    cy.contains('h2', 'Moderated phone').should('be.visible')
    cy.scrollTo('top')
    cy.get('body').then(body =>
      expect(body[0].scrollWidth).to.be.at.most(width)
    )
    cy.screenshot(`admin-products-${width}`, { capture: 'viewport' })
    cy.contains('button', 'Delete Product').click()
    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Delete Product').should('be.focused').click()
    cy.contains('button', 'Delete permanently').click()
    cy.get('[role="dialog"] [role="alert"]').should(
      'contain.text',
      'Temporarily unavailable'
    )
    cy.contains('h2', 'Moderated phone').should('exist')
    cy.then(() => {
      rejectDelete = false
    })
    cy.contains('button', 'Delete permanently').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('[aria-label="Publications"]').should('be.focused')
    cy.contains('h2', 'Moderated phone').should('not.exist')
    cy.get('#publication-search').clear()
    cy.contains('h2', 'Original phone').should('be.visible')
    cy.contains('button', 'Edit Product').click()
    cy.get('input[name="name"]').clear().type('Unsent draft')
    cy.window().then(win => win.setTestRole(false))
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('[role="alert"]').should('contain.text', 'Administrator access')
    cy.get('#publication-search').should('not.exist')
    cy.get('nav[aria-label="Main navigation"]')
      .contains('a', 'My products')
      .should('be.visible')
    cy.get('nav[aria-label="Main navigation"]')
      .contains('a', 'Admin panel')
      .should('not.exist')
  })
}

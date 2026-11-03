// Real app, controlled auth and HTTP boundaries. Server authorization is tested
// separately with signed JWTs and temporary MongoDB; this is not an auth bypass.
const entry = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script><script type="module" src="/cypress/fixtures/my-products-entry.tsx"></script></body></html>`

for (const width of [1280, 390, 320]) {
  it(`shares and moderates user publications across accounts at ${width}px`, () => {
    cy.viewport(width, 900)
    let product
    const favorites = { A: [], B: [], Admin: [] }
    let revision = 0
    cy.intercept('GET', '/__product-management-test', {
      headers: { 'content-type': 'text/html' },
      body: entry,
    })
    cy.intercept('GET', '**/node_modules/.vite/deps/@clerk_react.js*', {
      headers: { 'content-type': 'application/javascript' },
      body: `import React from '/node_modules/.vite/deps/react.js'; export const SignInButton = ({children}) => children; export const UserButton = () => React.createElement('button', { 'aria-label': 'Account' }, 'A');`,
    })
    cy.intercept({ pathname: '/api/**' }, req => {
      const path = new URL(req.url).pathname
      const user = String(req.headers.authorization ?? '').replace(
        'Bearer ',
        ''
      )
      if (path.startsWith('/api/me/favorites')) {
        if (!favorites[user])
          return req.reply({ statusCode: 401, body: { error: 'Sign in' } })
        if (path.endsWith('/merge') && req.method === 'POST') {
          favorites[user] = [...new Set([...favorites[user], ...req.body.ids])]
          revision++
        }
        if (path.includes('/items/') && req.method === 'PUT') {
          favorites[user] = ['community-phone']
          revision++
        }
        return req.reply({ ids: favorites[user], revision })
      }
      if (path === '/api/products' && req.method === 'POST') {
        expect(user).to.equal('A')
        product = { ...req.body, id: 'community-phone', image: '' }
        return req.reply({ statusCode: 201, body: product })
      }
      if (req.method === 'DELETE') {
        expect(user).to.equal('Admin')
        product = undefined
        for (const account of Object.keys(favorites)) favorites[account] = []
        revision++
        return req.reply({ statusCode: 204 })
      }
      if (path === '/api/admin/products')
        return req.reply(
          product
            ? [
                {
                  product,
                  ownerId: 'A',
                  createdAt: '2026-11-03T10:00:00.000Z',
                  notification: {
                    channel: 'telegram',
                    status: 'failed',
                    attempts: 0,
                    errorCode: 'configuration',
                    nextAttemptAt: null,
                    leaseUntil: null,
                  },
                },
              ]
            : []
        )
      if (path === '/api/me/products')
        return req.reply(user === 'A' && product ? [product] : [])
      if (path === '/api/products/catalog')
        return req.reply({
          items: product ? [product] : [],
          total: product ? 1 : 0,
          page: 1,
          pageSize: 6,
          min_price: 0,
          max_price: product?.price ?? 0,
        })
      if (path === '/api/products') return req.reply(product ? [product] : [])
      if (path === '/api/products/community-phone')
        return req.reply(
          product ?? { statusCode: 404, body: { error: 'Product not found' } }
        )
      return req.reply({
        statusCode: 404,
        body: { error: 'Unknown test endpoint' },
      })
    })
    cy.visit('/__product-management-test', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.sessionStorage.clear()
      },
    })
    cy.contains('button', 'Sign in or create account', {
      timeout: 20000,
    }).should('be.visible')
    cy.window().then(win => win.setTestAccount('A'))
    cy.contains("You haven't published any products yet.").should('be.visible')
    cy.contains('button', 'Add Product').click()
    cy.get('input[name="name"]').should('be.focused').type('Community phone')
    cy.get('input[name="price"]').clear().type('125')
    cy.contains('button', 'Create product').click()
    cy.contains('h2', 'Community phone').should('be.visible')
    cy.window().then(win => win.navigateTest('/product/community-phone'))
    cy.get('button[aria-label="Buy Community phone"]').click()
    cy.get('button[aria-label="Favorite Community phone"]').click()
    cy.wrap(null).should(() =>
      expect(favorites.A).to.deep.equal(['community-phone'])
    )
    cy.window().then(win => win.setTestAccount(null))
    cy.contains('h5', 'Community phone').should('be.visible')
    cy.contains('button', 'Edit Product').should('not.exist')
    cy.get('button[aria-label="Open cart, 1 items"]').should('be.visible')
    cy.window().then(win => win.setTestAccount('B'))
    cy.contains('h5', 'Community phone').should('be.visible')
    cy.get('button[aria-label="Favorite Community phone"]').should(
      'have.attr',
      'aria-pressed',
      'false'
    )
    cy.contains('button', 'Edit Product').should('not.exist')
    cy.contains('button', 'Delete Product').should('not.exist')
    cy.window().then(win => win.navigateTest('/my-products'))
    cy.contains("You haven't published any products yet.").should('be.visible')
    cy.window().then(win => {
      win.setTestAccount('Admin')
      win.setTestRole(true)
      win.navigateTest('/admin/products')
    })
    cy.contains('h1', 'Admin panel').should('be.visible')
    cy.contains('h2', 'Community phone').should('be.visible')
    cy.contains('button', 'Delete Product').click()
    cy.contains('button', 'Delete permanently').click()
    cy.contains('h2', 'Community phone').should('not.exist')
    cy.get('button[aria-label="Open cart, 0 items"]').should('be.visible')
    cy.window().then(win => {
      win.setTestRole(false)
      win.setTestAccount('A')
      win.navigateTest('/my-products')
    })
    cy.contains("You haven't published any products yet.").should('be.visible')
    cy.window().then(win => win.navigateTest('/favorites'))
    cy.contains('Your wishlist is empty').should('be.visible')
    cy.window().then(win =>
      expect(
        JSON.parse(win.localStorage.getItem('volt_cart')).items
      ).to.deep.equal([])
    )
    cy.get('body').then(body =>
      expect(body[0].scrollWidth).to.be.at.most(width)
    )
  })
}

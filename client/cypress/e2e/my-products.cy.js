// Browser coverage of the real app with external Clerk/API boundaries replaced.
// The test entry exists only in Cypress's intercepted response, never in the app.
const entry = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script><script type="module" src="/cypress/fixtures/my-products-entry.tsx"></script></body></html>`

for (const width of [1280, 390, 320]) {
  it(`manages own products with accessible navigation at ${width}px`, () => {
    cy.viewport(width, 900)
    let items = []
    cy.intercept('GET', '/__my-products-test', {
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
      if (req.method === 'POST') {
        const product = {
          ...req.body,
          id: `created-${items.length}`,
          image: '',
        }
        items = [...items, product]
        return req.reply({ statusCode: 201, body: product })
      }
      if (req.method === 'PATCH') {
        items = [{ ...items[0], ...req.body }]
        return req.reply(items[0])
      }
      if (req.method === 'DELETE') {
        items = items.filter(item => !path.endsWith('/' + item.id))
        return req.reply({ statusCode: 204 })
      }
      if (path === '/api/me/products')
        return req.reply(req.headers.authorization === 'Bearer A' ? items : [])
      if (path === '/api/products') return req.reply(items)
      return req.reply(items[0] ?? {})
    })
    cy.visit('/__my-products-test', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.sessionStorage.clear()
      },
    })
    cy.contains("You haven't published any products yet.", {
      timeout: 20000,
    }).should('be.visible')
    cy.get('nav[aria-label="Main navigation"]').within(() => {
      cy.contains('a', 'My products')
        .should('be.visible')
        .and('have.attr', 'aria-current', 'page')
      cy.get('a, button').each(element => {
        const rect = element[0].getBoundingClientRect()
        expect(rect.left).to.be.at.least(0)
        expect(rect.right).to.be.at.most(width)
      })
      cy.get('a[aria-label="VOLT home"]').then(brand => {
        cy.get('button[aria-label^="Theme:"]').then(theme => {
          expect(brand[0].getBoundingClientRect().right).to.be.at.most(
            theme[0].getBoundingClientRect().left
          )
        })
      })
    })
    cy.contains('button', 'Add Product').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('input[name="name"]').should('be.focused').type('My new phone')
    cy.get('input[name="price"]').clear().type('125')
    cy.contains('button', 'Create product').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('h2', 'My new phone').should('be.visible')
    cy.contains('button', 'Add Product').should('be.focused')
    cy.contains('button', 'Edit Product').click()
    cy.get('input[name="name"]').clear().type('Updated phone')
    cy.contains('button', 'Save changes').click()
    cy.contains('h2', 'Updated phone').should('be.visible')
    cy.get('body').then(body =>
      expect(body[0].scrollWidth).to.be.at.most(width)
    )
    cy.scrollTo('top')
    cy.screenshot(`my-products-${width}`, { capture: 'viewport' })
    cy.contains('button', 'Add Product').click()
    cy.get('input[name="name"]').type('Second phone')
    cy.get('input[name="price"]').clear().type('50')
    cy.contains('button', 'Create product').click()
    cy.contains('h2', 'Second phone').should('be.visible')
    cy.contains('button', 'Delete Product').click()
    cy.contains('button', 'Cancel').click()
    cy.contains('h2', 'Updated phone').should('be.visible')
    cy.contains('button', 'Delete Product').click()
    cy.contains('button', 'Delete permanently').click()
    cy.contains('h2', 'Updated phone').should('not.exist')
    cy.contains('h2', 'Second phone').should('be.visible')
    cy.get('[aria-label="Your products"]').should('be.focused')
    cy.contains('button', 'Delete Product').click()
    cy.contains('button', 'Delete permanently').click()
    cy.contains("You haven't published any products yet.").should('be.visible')
    cy.get('[aria-label="Your products"]').should('be.focused')
    cy.contains('h1', 'My products').should('be.visible')
    cy.contains('button', 'Add Product').click()
    cy.get('input[name="name"]').type('Private draft')
    cy.window().then(win => win.setTestAccount('B'))
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains("You haven't published any products yet.").should('be.visible')
    cy.window().then(win => win.setTestAccount(null))
    cy.contains('button', 'Sign in or create account').should('be.visible')
    cy.get('nav').contains('a', 'My products').should('not.exist')
  })
}

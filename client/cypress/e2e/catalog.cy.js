const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>'
  )
const products = Array.from({ length: 14 }, (_, i) => ({
  id: 'item ' + i,
  name: (i < 10 ? 'Phone ' : 'Laptop ') + String(i).padStart(2, '0'),
  price: i * 10,
  category: i < 10 ? 'phones' : 'laptops',
  description: 'A fixture product with a full description.',
  image,
  images: [image],
}))
function installApi() {
  cy.intercept('GET', '**/api/products/*', req => {
    const product = products.find(
      p => encodeURIComponent(p.id) === req.url.split('/').pop()
    )
    req.reply(
      product
        ? { body: product }
        : { statusCode: 404, body: { error: 'Product not found' } }
    )
  }).as('detail')
  cy.intercept('GET', '**/api/products', products).as('list')
  cy.intercept('GET', '**/api/products/catalog*', req => {
    const q = new URL(req.url).searchParams
    const list = products.filter(
      p =>
        (!q.get('text') ||
          p.name.toLowerCase().startsWith(q.get('text').toLowerCase())) &&
        (!q.has('category') || q.getAll('category').includes(p.category)) &&
        (!q.has('price') || p.price <= Number(q.get('price')))
    )
    const sort = q.get('sort') || 'price-lowest'
    list.sort((a, b) =>
      sort === 'price-highest'
        ? b.price - a.price
        : sort === 'name-z'
          ? b.name.localeCompare(a.name)
          : sort === 'name-a'
            ? a.name.localeCompare(b.name)
            : a.price - b.price
    )
    const size = Number(q.get('pageSize')) || 6
    const page = Math.min(
      Number(q.get('page')) || 1,
      Math.max(1, Math.ceil(list.length / size))
    )
    req.reply({
      items: list.slice((page - 1) * size, page * size),
      total: list.length,
      page,
      pageSize: size,
      min_price: 0,
      max_price: 130,
    })
  }).as('catalog')
}
describe('Standalone Vite storefront', () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    installApi()
  })
  it('navigates featured products with the carousel controls', () => {
    cy.visit('/')
    cy.wait('@list')
    cy.get('.swiper-slide-active img').should('have.attr', 'alt', 'Phone 00')
    cy.get('button[aria-label="Next product"]').click()
    cy.get('.swiper-slide-active img').should('have.attr', 'alt', 'Phone 01')
    cy.get('.swiper').its('0.swiper.animating').should('eq', false)
    cy.get('button[aria-label="Previous product"]').click()
    cy.get('.swiper-slide-active img').should('have.attr', 'alt', 'Phone 00')
    cy.get('.swiper').its('0.swiper.animating').should('eq', false)
    cy.get('.swiper-pagination-bullet').should('have.length', 5).last().click()
    cy.get('.swiper-slide-active img').should('have.attr', 'alt', 'Phone 04')
  })
  it('commits filters through URL, request and UI; resets page and retains unrelated params', () => {
    cy.visit('/?page=2&campaign=sale')
    cy.wait('@catalog')
    cy.get('input[type="search"]').type('Phone 01')
    cy.wait('@catalog')
      .its('request.query')
      .should('include', { text: 'Phone 01', pageSize: '6' })
    cy.location('search')
      .should('include', 'campaign=sale')
      .and('not.include', 'page=')
    cy.get('article[role="listitem"]')
      .should('have.length', 1)
      .and('contain', 'Phone 01')
    cy.get('select[name="sort"]').select('price-highest')
    cy.wait('@catalog').its('request.query.sort').should('eq', 'price-highest')
    cy.contains('button', /clear filters/i).click()
    cy.wait('@catalog')
    cy.location('search').should('eq', '?campaign=sale')
    cy.get('input[type="search"]').should('have.value', '')
  })
  it('opens a direct filtered URL and restores identical state on refresh', () => {
    const url =
      '/?text=Phone&category=phones&price=80&sort=price-highest&page=2'
    cy.visit(url)
    cy.wait('@catalog').its('request.query').should('include', {
      text: 'Phone',
      category: 'phones',
      price: '80',
      sort: 'price-highest',
      page: '2',
    })
    cy.get('input[type="search"]').should('have.value', 'Phone')
    cy.get('input[type="checkbox"]').first().should('be.checked')
    cy.get('article[role="listitem"]')
      .should('have.length', 3)
      .first()
      .should('contain', 'Phone 02')
    cy.reload()
    cy.wait('@catalog')
    cy.get('a[aria-current="page"]').should('have.text', '2')
    cy.get('article[role="listitem"]').first().should('contain', 'Phone 02')
  })
  it('handles page links, history and cached revisits', () => {
    cy.visit('/')
    cy.wait('@catalog')
    cy.get('a[aria-current="page"]').should('have.text', '1')
    cy.get('a')
      .filter((_, a) => a.textContent === '2')
      .click()
    cy.wait('@catalog')
    cy.location('search').should('include', 'page=2')
    cy.go('back')
    cy.get('a[aria-current="page"]').should('have.text', '1')
    cy.go('forward')
    cy.get('a[aria-current="page"]').should('have.text', '2')
  })
  it('defaults invalid URL values before requesting data and renders empty results', () => {
    cy.visit('/?price=-1&page=bad&sort=bad')
    cy.wait('@catalog')
      .its('request.query')
      .should('deep.equal', { pageSize: '6' })
    cy.get('select[name="sort"]').should('have.value', 'price-lowest')
    cy.get('input[type="search"]').type('missing')
    cy.wait('@catalog')
    cy.contains('Sorry, no products matched your search').should('be.visible')
  })
  it('supports dynamic detail links, native images and persistent cart after refresh', () => {
    cy.visit('/product/item%201')
    cy.wait('@detail')
    cy.get('button[aria-label="Buy Phone 01"]').click()
    cy.get('button[aria-label="Open cart, 1 items"]')
      .filter(':visible')
      .first()
      .click()
    cy.get('[role="dialog"]').should('contain', 'Phone 01')
    cy.reload()
    cy.wait('@detail')
    cy.get('button[aria-label="Open cart, 1 items"]')
      .filter(':visible')
      .first()
      .click()
    cy.get('[role="dialog"]').should('contain', 'Phone 01')
    cy.window()
      .its('localStorage')
      .invoke('getItem', 'volt_cart')
      .then(raw => expect(JSON.parse(raw).items[0].quantity).to.eq(1))
    cy.get('img[src^="data:image"]')
      .first()
      .should(img => expect(img[0].naturalWidth).to.be.greaterThan(0))
  })
  it('shows request errors and recovers on retry', () => {
    cy.intercept('GET', '**/api/products/catalog*', {
      statusCode: 503,
      body: { error: 'Unavailable' },
    })
    cy.visit('/')
    cy.contains('Unable to load products', { timeout: 12000 }).should(
      'be.visible'
    )
    installApi()
    cy.contains('button', 'Try again').click()
    cy.wait('@catalog')
    cy.get('article[role="listitem"]').should('have.length', 6)
  })
  it('validates and submits the existing contact form', () => {
    cy.visit('/contact')
    cy.contains('button', 'Send Message').should('be.disabled')
    cy.get('input[name="name"]').type('Alex')
    cy.get('input[name="email"]').type('bad')
    cy.contains('Email must be valid').should('be.visible')
    cy.get('input[name="email"]').clear().type('alex@example.com')
    cy.get('textarea[name="message"]').type('A sufficiently long message.')
    cy.window().then(win => cy.stub(win, 'alert').as('submitted'))
    cy.contains('button', 'Send Message').click()
    cy.get('@submitted').should('have.been.calledOnce')
    cy.get('input[name="name"]').should('have.value', '')
  })
  it('renders favorites and 404 routes', () => {
    cy.visit('/favorites')
    cy.title().should('eq', 'Favorites | React App')
    cy.visit('/missing/path')
    cy.contains('404 - Page Not Found').should('be.visible')
    cy.location('pathname', { timeout: 5000 }).should('eq', '/')
  })
  it('keeps mobile navigation and layout usable', () => {
    cy.viewport(390, 844)
    cy.visit('/')
    cy.wait('@catalog')
    cy.get('[class*="hero__shell"]').should(shell =>
      expect(shell[0].scrollWidth).to.be.at.most(shell[0].clientWidth + 1)
    )
    cy.get('button[aria-label="Open menu"]').should('be.visible').click()
    cy.get('a[href="/contact"]').filter(':visible').first().click()
    cy.location('pathname').should('eq', '/contact')
    cy.contains('Contact Us').should('be.visible')
    cy.document().then(doc =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(391)
    )
  })
})

describe('Accessible controls and modal interactions', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    installApi()
  })
  it('traps focus in mobile filters and sorting and restores the opener', () => {
    cy.visit('/')
    cy.wait('@catalog')
    cy.contains('button', /^Filters$/).click()
    cy.get('[role="dialog"][aria-label="Filters"]').should('be.visible')
    cy.get('#root').should('have.attr', 'inert')
    cy.focused().should('have.text', 'Close filters')
    cy.get('[role="dialog"] input[type="search"]').focus().type('Phone')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Clear search')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Maximum price')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', 'Close filters')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('#root').should('not.have.attr', 'inert')
    cy.focused().should('have.text', 'Filters')
    cy.contains('button', /^Sort$/).click()
    cy.focused().should('have.text', 'Close sorting')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.prop', 'tagName', 'SELECT')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', 'Close sorting')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.focused().should('have.text', 'Sort')
  })
  it('opens cart from the mobile menu and restores usable background', () => {
    cy.visit('/')
    cy.wait('@catalog')
    cy.get('[role="dialog"][aria-label="Navigation menu"]').should('not.exist')
    cy.get('button[aria-label="Open menu"]').click()
    cy.focused().should('have.attr', 'aria-label', 'Close navigation menu')
    cy.get('[role="dialog"] button[aria-label^="Open cart"]').click()
    cy.get('[role="dialog"]')
      .should('have.length', 1)
      .and('contain', 'Your cart is empty')
    cy.focused().should('have.attr', 'aria-label', 'Close cart')
    cy.get('#root').should('have.attr', 'inert')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('#root').should('not.have.attr', 'inert')
    cy.focused().should('have.attr', 'aria-label', 'Open menu')
    cy.document().its('body.style.overflow').should('eq', '')
  })
  it('cycles through chat form controls and closes with Escape', () => {
    cy.visit('/product/item%201')
    cy.wait('@detail')
    cy.get('button[aria-label="Open chat"]').click()
    cy.focused().should('have.attr', 'aria-label', 'Close chat')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused()
      .should('have.attr', 'aria-label', 'Your question')
      .type('Explain this product')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Send question')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Close chat')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="dialog"]').should('not.exist')
    cy.focused().should('have.attr', 'aria-label', 'Open chat')
  })
  it('toggles and reorders favorites with the keyboard', () => {
    cy.viewport(1280, 900)
    cy.visit('/')
    cy.wait('@catalog')
    cy.get('button[aria-label="Favorite Phone 00"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('button[aria-label="Favorite Phone 00"]').should(
      'have.attr',
      'aria-pressed',
      'true'
    )
    cy.get('button[aria-label="Favorite Phone 01"]')
      .focus()
      .should('be.focused')
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('button[aria-label="Favorite Phone 01"]').should(
      'have.attr',
      'aria-pressed',
      'true'
    )
    cy.get('a[href="/favorites"]').filter(':visible').first().click()
    cy.get('button[aria-label="Move Phone 01 up"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('[role="group"][aria-label^="Reorder"]')
      .first()
      .should('have.attr', 'aria-label', 'Reorder Phone 01')
    cy.get('button[aria-label="Move Phone 01 down"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('[role="group"][aria-label^="Reorder"]')
      .first()
      .should('have.attr', 'aria-label', 'Reorder Phone 00')
  })
})

describe('Catalog navigation anchors', () => {
  beforeEach(() => installApi())
  for (const width of [390, 1280]) {
    it(
      'scrolls to the catalog and retains keyboard focus at width ' + width,
      () => {
        cy.viewport(width, 900)
        cy.visit('/')
        cy.wait('@catalog')
        cy.get('a[href="#collection"]').first().click()
        cy.get('#collection')
          .should('have.length', 1)
          .should(elements => {
            const element = elements[0]
            const offset = parseFloat(
              element.ownerDocument.defaultView.getComputedStyle(element)
                .scrollMarginTop
            )
            expect(element.getBoundingClientRect().top).to.be.closeTo(offset, 3)
          })
        cy.intercept('GET', '**/api/products/catalog*', req => {
          req.on('response', res => res.setDelay(300))
        })
        cy.get('#collection a')
          .filter((_, a) => a.textContent === '2')
          .focus()
        cy.press(Cypress.Keyboard.Keys.ENTER)
        cy.focused().should('have.id', 'collection')
        cy.wait('@catalog')
        cy.get('a[aria-current="page"]').should('have.text', '2')
        cy.focused().should('have.id', 'collection')
        cy.get('#collection').should(elements => {
          const element = elements[0]
          const offset = parseFloat(
            element.ownerDocument.defaultView.getComputedStyle(element)
              .scrollMarginTop
          )
          expect(element.getBoundingClientRect().top).to.be.closeTo(offset, 3)
        })
      }
    )
  }
})

describe('Deferred feature loading', () => {
  it('loads the assistant on demand and keeps its dialog closable while loading', () => {
    installApi()
    let assistantRequests = 0
    // Match both Vite source modules and production chunks.
    cy.intercept(
      'GET',
      /\/(?:assets\/Chat-[^/?]+\.js|src\/components\/chat\/Chat\.tsx)(?:\?|$)/,
      req => {
        assistantRequests += 1
        req.on('response', res => res.setDelay(1000))
      }
    ).as('assistantCode')
    cy.visit('/')
    cy.wait('@catalog')
    cy.get('#collection img')
      .should('have.length.greaterThan', 0)
      .each(img => {
        expect(img).to.have.attr('loading', 'lazy')
      })
    cy.get('a[href="/product/item%201"]').first().click()
    cy.get('button[aria-label="Open chat"]').should('be.visible')
    cy.then(() => expect(assistantRequests).to.eq(0))
    cy.get('button[aria-label="Open chat"]').click()
    cy.contains('[role="status"]', 'Loading assistant...').should('be.visible')
    cy.get('button[aria-label="Close chat"]').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('#root').should('not.have.attr', 'inert')
    cy.wait('@assistantCode')
    cy.get('button[aria-label="Open chat"]').click()
    cy.get('input[aria-label="Your question"]').should('be.visible')
    cy.then(() => expect(assistantRequests).to.eq(1))
    cy.get('button[aria-label="Close chat"]').click()
  })
})

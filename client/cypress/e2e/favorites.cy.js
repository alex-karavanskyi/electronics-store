const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>'
  )
const products = ['Phone', 'Laptop', 'Tablet'].map((name, index) => ({
  id: String(index),
  name,
  price: 100 + index,
  category: 'electronics',
  description: 'A product for testing favorite reordering.',
  image,
  images: [image],
}))

beforeEach(() => {
  cy.intercept('GET', '**/api/products/*', req => {
    const id = decodeURIComponent(new URL(req.url).pathname.split('/').pop())
    const product = products.find(item => item.id === id)
    if (product) req.reply(product)
    else req.continue()
  })
})

function assertOrder(names) {
  cy.get('button[aria-label^="Drag to reorder"]').should(handles => {
    expect(
      [...handles].map(handle =>
        handle.getAttribute('aria-label').replace('Drag to reorder ', '')
      )
    ).to.deep.equal(names)
  })
}

function drag(name, targetName, direction, pointerType) {
  cy.get(`button[aria-label="Drag to reorder ${name}"]`).should('be.enabled')
  cy.window().then({ timeout: 15000 }, async win => {
    const handle = win.document.querySelector(
      `button[aria-label="Drag to reorder ${name}"]`
    )
    const target = win.document.querySelector(
      `button[aria-label="Drag to reorder ${targetName}"]`
    )
    const start = handle.getBoundingClientRect()
    const end = target.getBoundingClientRect()
    const x = start.x + start.width / 2
    const from = start.y + start.height / 2
    const to = end.y + end.height / 2 + direction * 35
    const options = {
      bubbles: true,
      pointerId: 1,
      pointerType,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
    }
    handle.dispatchEvent(
      new win.PointerEvent('pointerdown', { ...options, clientY: from })
    )
    for (let step = 1; step <= 35; step++) {
      win.dispatchEvent(
        new win.PointerEvent('pointermove', {
          ...options,
          clientY: from + ((to - from) * step) / 35,
        })
      )
      await new Promise(resolve => win.requestAnimationFrame(resolve))
    }
    const movingOrder = [
      ...win.document.querySelectorAll('button[aria-label^="Drag to reorder"]'),
    ].map(button =>
      button.getAttribute('aria-label').replace('Drag to reorder ', '')
    )
    expect(
      movingOrder,
      `order before release (${pointerType}, ${from} → ${to})`
    ).to.deep.equal(
      direction > 0
        ? ['Laptop', 'Tablet', 'Phone']
        : ['Phone', 'Laptop', 'Tablet']
    )
    const releaseTarget = win.document.elementFromPoint(x, to) || win
    releaseTarget.dispatchEvent(
      new win.PointerEvent('pointerup', { ...options, buttons: 0, clientY: to })
    )
    // Let the card settle before measuring its position for the next gesture.
    await new Promise(resolve => win.setTimeout(resolve, 300))
  })
}

for (const pointerType of ['mouse', 'touch']) {
  it(`keeps favorites sortable through repeated ${pointerType} drags in both directions`, () => {
    cy.viewport(pointerType === 'touch' ? 375 : 1280, 900)
    cy.intercept('GET', '**/api/products', products)
    cy.intercept('GET', '**/api/products/catalog*', {
      items: products,
      total: 3,
      page: 1,
      pageSize: 6,
      min_price: 100,
      max_price: 102,
    }).as('catalog')
    cy.visit('/')
    cy.wait('@catalog')
    for (const product of products)
      cy.get(`button[aria-label="Favorite ${product.name}"]`).click()
    cy.get('a[href="/favorites"]').filter(':visible').first().click()
    cy.scrollTo('top')
    assertOrder(['Phone', 'Laptop', 'Tablet'])
    for (let round = 0; round < 4; round++) {
      drag('Phone', 'Tablet', 1, pointerType)
      assertOrder(['Laptop', 'Tablet', 'Phone'])
      drag('Phone', 'Laptop', -1, pointerType)
      assertOrder(['Phone', 'Laptop', 'Tablet'])
    }
    cy.get('button[aria-label="Move Phone down"]').click()
    assertOrder(['Laptop', 'Phone', 'Tablet'])
    drag('Phone', 'Tablet', 1, pointerType)
    assertOrder(['Laptop', 'Tablet', 'Phone'])
    cy.window().then(win => {
      expect(
        JSON.parse(win.localStorage.getItem('volt_favorites'))
      ).to.deep.equal({
        version: 1,
        ids: ['1', '2', '0'],
        pendingImports: [],
      })
    })
    cy.reload()
    assertOrder(['Laptop', 'Tablet', 'Phone'])
    cy.contains('li', 'Tablet').contains('button', 'Delete').click()
    cy.reload()
    assertOrder(['Laptop', 'Phone'])
  })
}

it('restores ID-only favorites on a direct visit and recovers from damaged storage', () => {
  cy.visit('/favorites', {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'volt_favorites',
        JSON.stringify({ version: 1, ids: ['2', '0', '2'] })
      )
    },
  })
  assertOrder(['Tablet', 'Phone'])
  cy.get('button[aria-label="Move Phone up"]').click()
  cy.reload()
  assertOrder(['Phone', 'Tablet'])
  cy.visit('/favorites', {
    onBeforeLoad(win) {
      win.localStorage.setItem('volt_favorites', '{')
    },
  })
  cy.contains('Your wishlist is empty').should('be.visible')
})

it('keeps drag ordering after the responsive layout settles on resize', () => {
  cy.viewport(1280, 900)
  cy.visit('/favorites', {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'volt_favorites',
        JSON.stringify({ version: 1, ids: ['0', '1', '2'] })
      )
    },
  })
  assertOrder(['Phone', 'Laptop', 'Tablet'])
  cy.viewport(375, 900)
  // Framer Motion 10 blocks projection measurements for 250ms after resize.
  cy.wait(300)
  drag('Phone', 'Tablet', 1, 'touch')
  assertOrder(['Laptop', 'Tablet', 'Phone'])
  cy.reload()
  assertOrder(['Laptop', 'Tablet', 'Phone'])
})

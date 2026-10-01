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
    cy.viewport(1280, 900)
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
    cy.viewport(pointerType === 'touch' ? 375 : 1280, 900)
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
  })
}

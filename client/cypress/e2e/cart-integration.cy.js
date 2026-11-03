const phone = {
  id: 'live_phone',
  name: 'Saved Phone',
  price: 125,
  description: '',
  category: 'phones',
  image: '',
  images: [],
}

function fillCheckout() {
  cy.contains('summary', 'Delivery details').click()
  for (const [name, value] of Object.entries({
    name: 'Alex Morgan',
    phone: '+15550000000',
    email: 'alex@example.com',
    address: '12 Main Street',
    city: 'Kyiv',
    postalCode: '01001',
    country: 'Ukraine',
  }))
    cy.get(`[name="${name}"]`).clear().type(value)
}

function visitWithCart(path) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'volt_cart',
        JSON.stringify({
          version: 1,
          items: [{ product: phone, quantity: 2 }],
        })
      )
    },
  })
}

for (const width of [1280, 390, 320]) {
  it(`reconciles saved cart and handles outage/deletion at checkout at ${width}px`, () => {
    cy.viewport(width, 900)
    let status = 200
    cy.intercept({ pathname: '/api/**' }, req => {
      expect(req.method).to.equal('GET')
      req.reply(
        status === 200
          ? { ...phone, name: 'Updated Phone', price: 200 }
          : { statusCode: status, body: { error: 'Product unavailable' } }
      )
    })
    visitWithCart('/checkout')
    cy.contains('a', 'Updated Phone').should('be.visible')
    cy.contains('strong', '$400.00').should('be.visible')
    cy.window().then(win => {
      expect(
        JSON.parse(win.localStorage.getItem('volt_cart')).items[0]
      ).to.deep.equal({
        product: { ...phone, name: 'Updated Phone', price: 200 },
        quantity: 2,
      })
    })
    fillCheckout()
    cy.then(() => {
      status = 503
    })
    cy.contains('button', 'Place order').click()
    cy.get('[role="alert"]').should('contain', 'Unable to check your cart')
    cy.contains('no order has been placed').should('not.exist')
    cy.contains('a', 'Updated Phone').should('exist')
    cy.then(() => {
      status = 404
    })
    cy.contains('button', 'Place order').click()
    cy.contains('Your cart is empty').should('be.visible')
    cy.contains('button', 'Place order').should('not.exist')
    cy.window().then(win => {
      expect(
        JSON.parse(win.localStorage.getItem('volt_cart')).items
      ).to.deep.equal([])
    })
  })

  it(`preserves live cart across reload despite old demo storage at ${width}px`, () => {
    cy.viewport(width, 900)
    cy.intercept({ pathname: '/api/**' }, req => req.reply(phone))
    visitWithCart('/checkout')
    cy.contains('a', 'Saved Phone').should('be.visible')
    cy.window().then(win => {
      win.sessionStorage.setItem('volt_demo_mode', 'demo')
      win.localStorage.setItem(
        'volt_demo_v1',
        JSON.stringify({
          version: 1,
          resetId: 'old',
          products: [],
          favoriteIds: [],
        })
      )
      win.localStorage.setItem(
        'volt_favorites',
        JSON.stringify({ version: 1, ids: [phone.id] })
      )
    })
    cy.reload()
    cy.contains('a', 'Saved Phone').should('be.visible')
    cy.contains('button', 'Try Demo Mode').should('not.exist')
    cy.contains('button', 'Exit Demo Mode').should('not.exist')
    cy.get('button[aria-label="Open cart, 2 items"]').should('be.visible')
    fillCheckout()
    cy.contains('button', 'Place order').click()
    cy.contains('no order has been placed').should('be.visible')
    cy.window().then(win => {
      expect(
        JSON.parse(win.localStorage.getItem('volt_cart')).items
      ).to.deep.equal([{ product: phone, quantity: 2 }])
      expect(
        JSON.parse(win.localStorage.getItem('volt_favorites')).ids
      ).to.deep.equal([phone.id])
    })
  })
}

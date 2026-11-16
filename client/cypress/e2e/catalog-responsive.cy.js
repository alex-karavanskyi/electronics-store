import { homeData } from '../fixtures/home'

const product = {
  id: 'responsive-phone',
  name: 'PhoneWithAnExtremelyLongUnbrokenModelNumber1234567890',
  price: 99999,
  category: 'phones',
  description: 'Responsive catalog fixture.',
  image:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/%3E',
  images: [],
}

describe('Responsive catalog layout', () => {
  for (const width of [320, 375, 768, 1024, 1025]) {
    it(`keeps card controls and sorting within their containers at ${width}px`, () => {
      cy.viewport(width, 900)
      cy.intercept('GET', '**/api/products/home', homeData([product]))
      cy.intercept('GET', '**/api/products/catalog*', {
        items: [product],
        total: 600,
        page: 50,
        pageSize: 6,
        min_price: 0,
        max_price: 99999,
      }).as('catalog')
      cy.visit('/?page=50')
      cy.wait('@catalog')
      cy.get('#collection article')
        .first()
        .should(card => {
          const bounds = card[0].getBoundingClientRect()
          expect(bounds.left).to.be.at.least(0)
          expect(bounds.right).to.be.at.most(width)
          for (const element of card[0].querySelectorAll(
            'footer h3, footer h4, footer h5, footer button'
          )) {
            const child = element.getBoundingClientRect()
            expect(child.left).to.be.at.least(bounds.left)
            expect(child.right).to.be.at.most(bounds.right)
          }
          expect(card[0].scrollWidth).to.be.at.most(card[0].clientWidth + 1)
        })
      cy.get('nav[aria-label="Product pagination"] a').should('have.length', 7)
      if (width <= 1024) cy.contains('button', /^Sort$/).click()
      cy.get('select[name="sort"]')
        .should('be.visible')
        .and(select => {
          const element = select[0]
          const bounds = element.getBoundingClientRect()
          const panel = element.closest('[role="dialog"]')
          expect(bounds.left).to.be.at.least(0)
          expect(bounds.right).to.be.at.most(width)
          if (panel) {
            const content = element.closest('[class*="sidebarContent"]')
            expect(content.scrollWidth).to.be.at.most(content.clientWidth + 1)
          }
        })
    })
  }
})

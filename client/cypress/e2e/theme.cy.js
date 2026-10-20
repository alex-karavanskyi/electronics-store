function systemTheme(value) {
  return cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-color-scheme', value }] },
    })
  )
}

const switcher = () =>
  cy.get('button[aria-haspopup="menu"][aria-label^="Theme:"]')
function chooseMode(mode) {
  switcher().click()
  cy.get('[role="menuitemradio"]')
    .contains(new RegExp('^' + mode + '$', 'i'))
    .click()
}

function contrast(first, second) {
  const luminance = color => {
    const channels = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map(value => {
        const channel = value / 255
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b)
  return (values[1] + 0.05) / (values[0] + 0.05)
}

function readableField(input) {
  const style = input[0].ownerDocument.defaultView.getComputedStyle(input[0])
  expect(
    contrast(style.color, style.backgroundColor),
    'field text contrast'
  ).to.be.at.least(4.5)
  expect(
    contrast(style.borderTopColor, style.backgroundColor),
    'field border contrast'
  ).to.be.at.least(3)
}

describe('Theme preferences', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/products', [])
  })

  afterEach(() => systemTheme('light'))

  it('opens the icon menu and selects a mode with the keyboard', () => {
    cy.visit('/contact')
    chooseMode('light')
    switcher().focus().type('{downarrow}')
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should('have.text', 'Light').type('{downarrow}')
    cy.focused().should('have.text', 'Dark').type('{enter}')
    switcher().should('have.attr', 'aria-label', 'Theme: dark')
    switcher().should('have.focus')
    cy.get('[role="menu"]').should('not.exist')
    chooseMode('light')
    switcher().click()
    cy.get('[role="menuitemradio"][aria-checked="true"]').should(
      'have.text',
      'Light'
    )
    cy.screenshot('theme-menu-light')
    cy.focused().type('{esc}')
    switcher().should('have.focus')
    cy.get('[role="menu"]').should('not.exist')
  })

  it('synchronizes separate windows using real storage events', () => {
    cy.visit('/contact')
    chooseMode('light')
    cy.document()
      .then(
        document =>
          new Cypress.Promise(resolve => {
            const frame = document.createElement('iframe')
            frame.hidden = true
            frame.title = 'Second theme window'
            frame.src = '/contact'
            frame.onload = () => resolve(frame.contentWindow)
            document.body.append(frame)
          })
      )
      .as('otherWindow')
    cy.get('@otherWindow').then(win => {
      win.localStorage.setItem('volt_theme', 'dark')
    })
    switcher().should('have.attr', 'aria-label', 'Theme: dark')
    cy.get('html').should('have.attr', 'data-theme', 'dark')
    chooseMode('light')
    cy.get('@otherWindow').then(win => {
      cy.wrap(win.document)
        .find('button[aria-haspopup="menu"]')
        .should('have.attr', 'aria-label', 'Theme: light')
      cy.wrap(win.document.documentElement).should(
        'have.attr',
        'data-theme',
        'light'
      )
    })
    cy.get('@otherWindow').then(win => {
      win.localStorage.setItem('volt_theme', 'system')
    })
    switcher().should('have.attr', 'aria-label', 'Theme: system')
    systemTheme('dark')
    cy.get('html').should('have.attr', 'data-theme', 'dark')
    cy.window().then(win =>
      expect(win.localStorage.getItem('volt_theme')).to.equal('system')
    )
  })

  for (const mode of ['light', 'dark']) {
    it(`uses the ${mode} palette for the contact form and product chat`, () => {
      const light = mode === 'light'
      const text = light ? 'rgb(23, 33, 43)' : 'rgb(237, 242, 244)'
      cy.visit('/contact')
      chooseMode(mode)
      cy.contains('h2', 'Contact Us')
        .should('have.css', 'color', text)
        .parent()
        .parent()
        .should(
          'have.css',
          'background-color',
          light ? 'rgb(255, 255, 255)' : 'rgb(24, 24, 24)'
        )
      cy.get('input[autocomplete="name"]')
        .should('have.css', 'color', text)
        .and(
          'have.css',
          'background-color',
          light ? 'rgb(244, 246, 243)' : 'rgb(38, 38, 38)'
        )
        .and('have.css', 'color-scheme', mode)
      cy.get('input[autocomplete="name"]').should(readableField)
      cy.intercept('GET', '**/api/products/theme-product', {
        id: 'theme-product',
        name: 'Theme phone',
        description: 'A theme test product',
        category: 'phones',
        price: 125,
        image: '/favicon.png',
        images: ['/favicon.png'],
      })
      cy.visit('/product/theme-product')
      cy.get('button[aria-label="Open chat"]').click()
      cy.get('[role="dialog"][aria-label="Product assistant"]').should(
        'be.visible'
      )
      cy.get('input[aria-label="Your question"]')
        .should('have.css', 'color', text)
        .and(
          'have.css',
          'background-color',
          light ? 'rgb(244, 246, 243)' : 'rgb(35, 39, 47)'
        )
        .and('have.css', 'color-scheme', mode)
      cy.get('input[aria-label="Your question"]').should(readableField)
      cy.contains('strong', 'Product Assistant').should(
        'have.css',
        'color',
        text
      )
      cy.get('button[aria-label="Close chat"]').click()
    })
  }

  it('tracks the OS live, honors manual choices and restores after reload', () => {
    systemTheme('dark')
    cy.visit('/contact')
    switcher().should('have.attr', 'aria-label', 'Theme: system')
    cy.get('html').should('have.attr', 'data-theme', 'dark')
    cy.get('body').should('have.css', 'background-color', 'rgb(17, 26, 32)')
    systemTheme('light')
    cy.get('html').should('have.attr', 'data-theme', 'light')
    cy.get('body').should('have.css', 'background-color', 'rgb(244, 246, 243)')
    chooseMode('dark')
    cy.reload()
    switcher().should('have.attr', 'aria-label', 'Theme: dark')
    cy.get('html').should('have.attr', 'data-theme', 'dark')
    systemTheme('dark')
    chooseMode('light')
    cy.get('html').should('have.attr', 'data-theme', 'light')
    chooseMode('system')
    cy.get('html').should('have.attr', 'data-theme', 'dark')
  })

  it('applies the theme while the React entry is still loading', () => {
    let initializedBeforeReact = false
    cy.intercept('GET', '**/src/main.tsx*', req => {
      req.on('response', res => res.setDelay(800))
    })
    cy.visit('/contact', {
      onBeforeLoad(win) {
        win.localStorage.setItem('volt_theme', 'dark')
        const observer = new win.MutationObserver(() => {
          if (
            win.document.querySelector('script[type="module"][src*="main.tsx"]')
          ) {
            expect(win.document.documentElement.dataset.theme).to.equal('dark')
            expect(win.document.documentElement.style.colorScheme).to.equal(
              'dark'
            )
            expect(
              win.document.getElementById('root')?.childElementCount ?? 0
            ).to.equal(0)
            initializedBeforeReact = true
            observer.disconnect()
          }
        })
        observer.observe(win.document, { childList: true, subtree: true })
      },
    })
    switcher().should('have.attr', 'aria-label', 'Theme: dark')
    cy.then(() => expect(initializedBeforeReact).to.equal(true))
  })

  it('keeps the switcher visible and navigation usable at phone and tablet widths', () => {
    cy.visit('/contact')
    for (const width of [320, 768, 1024]) {
      cy.viewport(width, 800)
      switcher().should('be.visible')
      chooseMode('dark')
      switcher().click()
      cy.get('[role="menu"]').should(menu => {
        const rect = menu[0].getBoundingClientRect()
        expect(rect.left).to.be.at.least(0)
        expect(rect.right).to.be.at.most(width)
      })
      cy.focused().type('{esc}')
      cy.get('nav')
        .first()
        .then(nav => {
          for (const element of nav[0].querySelectorAll('a, button, select')) {
            if (!element.getClientRects().length) continue
            const rect = element.getBoundingClientRect()
            expect(rect.left).to.be.at.least(0)
            expect(rect.right).to.be.at.most(width)
          }
        })
    }
    cy.viewport(320, 800)
    cy.get('button[aria-label="Open menu"]').click()
    cy.get('[role="dialog"][aria-label="Navigation menu"]').should('be.visible')
    cy.get('button[aria-label="Close navigation menu"]').click()
    switcher().should('be.visible')
  })
})

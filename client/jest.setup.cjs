const { TextEncoder, TextDecoder } = require('node:util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')
window.scrollTo = jest.fn()

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

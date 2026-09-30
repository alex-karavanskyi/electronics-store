import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Swiper } from 'swiper/react'
import type { SwiperProps } from 'swiper/react'
import type { Swiper as SwiperInstance } from 'swiper'

import { mockFetch, jsonResponse } from '../support/fetch'
import Slider from '@/components/home/slider/Slider'

const mockSwiper = { slidePrev: jest.fn(), slideNext: jest.fn() }

jest.mock('swiper/css', () => ({}))
jest.mock('swiper/css/effect-fade', () => ({}))
jest.mock('swiper/css/pagination', () => ({}))
jest.mock('swiper/modules', () => ({
  Autoplay: {},
  EffectFade: {},
  Pagination: {},
}))
jest.mock('swiper/react', () => ({
  Swiper: jest.fn(function MockSwiper({ children, onSwiper }: SwiperProps) {
    useEffect(() => {
      onSwiper?.(mockSwiper as unknown as SwiperInstance)
    }, [onSwiper])
    return <div>{children}</div>
  }),
  SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const products = Array.from({ length: 7 }, (_, index) => ({
  id: `phone-${index}`,
  name: `Phone ${index}`,
  price: 125,
  category: 'phones',
  description: 'Phone description',
  image: `/phone-${index}.png`,
  images: [`/phone-${index}.png`],
}))
let client: QueryClient

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => client.clear())

function setup() {
  return render(
    <QueryClientProvider client={client}>
      <Slider />
    </QueryClientProvider>
  )
}

it('keeps the hero copy and catalogue links visible while showing the loading skeleton', () => {
  mockFetch.mockImplementation(() => new Promise(() => {}))
  const { container } = setup()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Better technology for everyday life.'
  )
  expect(
    screen.getByRole('link', { name: 'Browse the catalogue' })
  ).toHaveAttribute('href', '#collection')
  expect(
    screen.getByRole('link', { name: 'Browse all products' })
  ).toHaveAttribute('href', '#collection')
  expect(screen.getByLabelText('Store highlights')).toHaveTextContent(
    'Official warranty'
  )
  expect(container.querySelector('.skeletonSlide')).toBeInTheDocument()
  expect(
    screen.queryByText('Featured products will appear here soon.')
  ).not.toBeInTheDocument()
  expect(Swiper).not.toHaveBeenCalled()
})

it('shows the first five products, prioritizes the first image and connects both controls', async () => {
  mockFetch.mockResolvedValue(jsonResponse(products))
  setup()
  await screen.findByAltText('Phone 0')
  const images = screen.getAllByRole('img')
  expect(images.map(image => image.getAttribute('alt'))).toEqual([
    'Phone 0',
    'Phone 1',
    'Phone 2',
    'Phone 3',
    'Phone 4',
  ])
  expect(images[0]).toHaveAttribute('loading', 'eager')
  for (const image of images.slice(1))
    expect(image).toHaveAttribute('loading', 'lazy')
  const calls = jest.mocked(Swiper).mock.calls
  expect(calls[calls.length - 1][0]).toMatchObject({
    effect: 'fade',
    speed: 900,
    loop: true,
    autoplay: { delay: 4500, disableOnInteraction: false },
    pagination: { clickable: true },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Previous product' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next product' }))
  expect(mockSwiper.slidePrev).toHaveBeenCalledTimes(1)
  expect(mockSwiper.slideNext).toHaveBeenCalledTimes(1)
})

it('disables automatic cycling, pagination and arrows when there is only one product', async () => {
  mockFetch.mockResolvedValue(jsonResponse(products.slice(0, 1)))
  setup()
  expect(await screen.findByAltText('Phone 0')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Previous product' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Next product' })
  ).not.toBeInTheDocument()
  const calls = jest.mocked(Swiper).mock.calls
  expect(calls[calls.length - 1][0]).toMatchObject({
    loop: false,
    autoplay: false,
    pagination: false,
  })
})

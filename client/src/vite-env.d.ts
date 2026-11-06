/// <reference types="vite/client" />

declare module 'swiper/css'
declare module 'swiper/css/effect-fade'
declare module 'swiper/css/pagination'

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
}

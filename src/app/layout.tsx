import './globals.scss'
import { Inter, Sora } from 'next/font/google'

import { Metadata } from 'next'

import { CartDrawer } from '@/components/cart'
import { Footer, Navbar, Sidebar } from '@/layout'
import { ReduxProvider } from '@/redux/provider'
import CartHydrator from '@/shared/lib/CartHydrator'
import ClientOnly from '@/shared/lib/ClientOnly'
import FiltersCleaner from '@/shared/lib/FiltersCleaner'
import QueryProvider from '@/shared/lib/QueryProvider'

const inter = Inter({ subsets: ['latin'] })
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'VOLT — Technology for everyday life',
  description:
    'A curated selection of technology for work, home and entertainment.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${sora.variable}`}>
        <ClientOnly>
          <ReduxProvider>
            <QueryProvider>
              <CartHydrator />
              <FiltersCleaner />
              <Navbar />
              <main style={{ flex: 1 }}>{children}</main>
              <Footer />
              <Sidebar />
              <CartDrawer />
            </QueryProvider>
          </ReduxProvider>
        </ClientOnly>
      </body>
    </html>
  )
}

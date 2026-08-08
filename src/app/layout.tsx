import './globals.css'
import { Inter } from 'next/font/google'

import { Metadata } from 'next'

import { Footer, Navbar, Sidebar } from '@/layout'
import { ReduxProvider } from '@/redux/provider'
import ClientOnly from '@/shared/lib/ClientOnly'
import FiltersCleaner from '@/shared/lib/FiltersCleaner'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <ClientOnly>
          <ReduxProvider>
            <FiltersCleaner />
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
            <Sidebar />
          </ReduxProvider>
        </ClientOnly>
      </body>
    </html>
  )
}

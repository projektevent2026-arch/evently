import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import BottomNav from '@/components/BottomNav'
import './globals.css'
import "leaflet/dist/leaflet.css"

const _inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const _spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'Evently - Odkryj najlepsze wydarzenia w Twojej okolicy',
  description: 'Platforma do odkrywania lokalnych wydarzen w Polsce. Koncerty, festiwale, kultura, sport i wiele wiecej.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Evently',
  },
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2d9e5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className="dark">
      <body className={`${_inter.variable} ${_spaceGrotesk.variable} font-sans antialiased`}>
        {children}
        <BottomNav />
        <Analytics />
      </body>
    </html>
  )
}
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const _spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'Evently - Odkryj najlepsze wydarzenia w Twojej okolicy',
  description: 'Platforma do odkrywania lokalnych wydarzeń w Polsce. Koncerty, festiwale, kultura, sport i wiele więcej.',
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
  },
}

export const viewport: Viewport = {
  themeColor: '#2d9e5f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl">
      <body className={`${_inter.variable} ${_spaceGrotesk.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { AnalyticsWithOptOut } from '@/components/AnalyticsWithOptOut'
import BottomNav from '@/components/BottomNav'
import './globals.css'
// 2026-09-22: usunięty stąd import "leaflet/dist/leaflet.css" — ładował się
// GLOBALNIE na każdej stronie (nawet /login, /regulamin, gdzie nie ma
// żadnej mapy), blokując renderowanie (~140ms wg PageSpeed). MiniMap.tsx
// i EventMap.tsx już same importują ten CSS u siebie — więc nic się nie
// psuje tam, gdzie mapa faktycznie jest, a wszędzie indziej przestaje
// być niepotrzebnym obciążeniem.

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
  // 2026-09-22: maximumScale: 1 + userScalable: false usunięte — blokowały
  // zoom, co PageSpeed konsekwentnie zgłaszał jako problem dostępności
  // (osoba słabowidząca nie mogła powiększyć strony). maximumScale: 5 to
  // sensowny górny limit, nie "bez ograniczeń".
  maximumScale: 5,
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
        {/* beforeSend + localStorage("va-disable") — przeniesione do
            osobnego komponentu klienckiego (AnalyticsWithOptOut), bo ten
            plik jest serwerowy i nie może przekazać funkcji jako propsa.
            Ustaw raz w konsoli: localStorage.setItem('va-disable', '1')
            — Twoje własne wejścia (na TYM urządzeniu/przeglądarce)
            przestaną być liczone, reszta odwiedzających bez zmian. */}
        <AnalyticsWithOptOut />
      </body>
    </html>
  )
}
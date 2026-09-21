'use client'

import { Analytics } from '@vercel/analytics/next'

// Musi być osobnym plikiem 'use client' — app/layout.tsx jest komponentem
// SERWEROWYM (wymusza to m.in. export const metadata), a serwerowy
// komponent nie może przekazać FUNKCJI jako propsa do komponentu
// klienckiego (RSC nie potrafi tego zserializować). beforeSend musi więc
// żyć w kodzie, który sam jest już po stronie klienta od początku.
export function AnalyticsWithOptOut() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (typeof window !== 'undefined' && localStorage.getItem('va-disable')) {
          return null
        }
        return event
      }}
    />
  )
}
'use client'

import { useLayoutEffect, useState } from 'react'
import MobileEventDetail from '@/components/MobileEventDetail'
import EventPageClient from '@/components/EventPageClient'

export default function EventDetailWrapper({ slug }: { slug: string }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // 2026-10-31: useLayoutEffect zamiast useEffect. useEffect odpala się PO pierwszym malowaniu,
  // więc przy zajętym wątku (ładowanie kodu strony) widać było czarny ekran (div poniżej),
  // zanim wrapper dowiedział się, czy to telefon czy komputer. useLayoutEffect ustawia stan
  // przed malowaniem, więc od razu rysuje się właściwy widok ze skeletonem. Przy renderze na
  // serwerze wciąż jest ciemny div (nie znamy jeszcze szerokości ekranu), bez błędu hydracji.
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile === null) return <div className="min-h-screen bg-[#0a0a0a]" />
  if (isMobile) return <MobileEventDetail slug={slug} />
  return <EventPageClient slug={slug} />
}
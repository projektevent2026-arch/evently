'use client'

import { useLayoutEffect, useState } from 'react'
import MobileEventDetail from '@/components/MobileEventDetail'
import EventPageClient from '@/components/EventPageClient'

// initialEvent: wydarzenie pobrane na serwerze (app/events/[slug]/page.tsx), wraz z terminami
// i profilem organizatora. Gdy jest, komponenty rysuja od razu pelna tresc, bez szkieletu.
// Gdy go nie ma (null), komponenty pobieraja dane w przegladarce jak dotad.
export default function EventDetailWrapper({ slug, initialEvent }: { slug: string; initialEvent?: any }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // 2026-10-31: useLayoutEffect zamiast useEffect. useEffect odpala sie PO pierwszym malowaniu,
  // wiec przy zajetym watku (ladowanie kodu strony) widac bylo czarny ekran (div ponizej),
  // zanim wrapper dowiedzial sie, czy to telefon czy komputer. useLayoutEffect ustawia stan
  // przed malowaniem, wiec od razu rysuje sie wlasciwy widok. Przy renderze na serwerze wciaz
  // jest ciemny div (nie znamy jeszcze szerokosci ekranu), bez bledu hydracji.
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile === null) return <div className="min-h-screen bg-[#0a0a0a]" />
  // key={slug}: przejscie z jednego wydarzenia na inne (np. z "Podobnych") musi wyzerowac stan
  // komponentu, bo start z initialEvent czyta dane tylko przy pierwszym renderze.
  if (isMobile) return <MobileEventDetail key={slug} slug={slug} initialEvent={initialEvent} />
  return <EventPageClient key={slug} slug={slug} initialEvent={initialEvent} />
}
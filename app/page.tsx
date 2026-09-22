import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { EventsGrid } from "@/components/events-grid"
import { LocationSidebar } from "@/components/location-sidebar"
import { Footer } from "@/components/footer"
import { MobileHome } from "@/components/MobileHome"
import { getPublishedEvents } from "@/lib/getPublishedEvents"

export const revalidate = 60

export default async function HomePage() {
  // Pierwsze wczytanie wydarzeń PO STRONIE SERWERA — trafia od razu do
  // HTML-a, zamiast czekać na fetch w przeglądarce po hydratacji.
  // To był główny powód LCP 5,1s na mobile w PageSpeed z 22.09.2026
  // (pierwszy HTML pokazywał "0 wydarzeń" / "Ładowanie...", karty
  // doklejały się dopiero po JS-ie).
  //
  // Jeśli zapytanie się wywali, initialEvents zostaje undefined — oba
  // komponenty (MobileHome, EventsGrid) mają wbudowany fallback: wtedy
  // po prostu wracają do swojego dotychczasowego fetcha po stronie
  // klienta, więc strona nie pada, tylko traci przyspieszenie.
  let initialEvents: any[] | undefined
  try {
    initialEvents = await getPublishedEvents()
  } catch (err) {
    console.error('[Evently] SSR: nie udało się pobrać wydarzeń:', err)
    initialEvents = undefined
  }

  return (
    <>
      {/* ── MOBILE / PWA ── */}
      <div className="block md:hidden">
        <MobileHome initialEvents={initialEvents} />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={null}>
            <HeroSection />
          </Suspense>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              <aside className="w-full lg:w-72 lg:shrink-0">
                <Suspense fallback={null}>
                  <LocationSidebar />
                </Suspense>
              </aside>
              <div className="flex-1 min-w-0">
                <Suspense fallback={<div>Ładowanie...</div>}>
                  <EventsGrid initialEvents={initialEvents} />
                </Suspense>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
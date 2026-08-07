import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { EventsGrid } from "@/components/events-grid"
import { LocationSidebar } from "@/components/location-sidebar"
import { Footer } from "@/components/footer"
import { MobileHome } from "@/components/MobileHome"

export const revalidate = 60

export default function HomePage() {
  return (
    <>
      {/* ── MOBILE / PWA ── */}
      <div className="block md:hidden">
        <MobileHome />
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
                  <EventsGrid />
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
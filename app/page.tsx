import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { EventsGrid } from "@/components/events-grid"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <EventsGrid />
      </main>
      <Footer />
    </div>
  )
}

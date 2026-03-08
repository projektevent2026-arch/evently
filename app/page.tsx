import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { CategoryFilters } from "@/components/category-filters"
import { EventsGrid } from "@/components/events-grid"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CategoryFilters />
        <EventsGrid />
      </main>
      <Footer />
    </div>
  )
}

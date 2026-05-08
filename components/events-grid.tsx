"use client"

import { useState, useEffect } from "react"
import { EventCard, type EventData } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["culture", "music", "food", "sport", "family", "technology"]
const CATEGORY_LABELS: Record<string, string> = {
  culture: "Kultura", music: "Muzyka", food: "Jedzenie",
  sport: "Sport", family: "Rodzinne", technology: "Technologia",
}

export function EventsGrid() {
  const [events, setEvents] = useState<EventData[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Błąd message:', error.message)
        return
      }

      const mapped = (data || []).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        date: e.start_date ? new Date(e.start_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        start_date: e.start_date,
        city: e.city,
        image: e.cover_image_url || '/images/event-concert.jpg',
        interested: e.interested_count || 0,
        category: e.category || 'Inne',
        price: e.price ? `od ${e.price} zł` : 'Wstęp wolny',
      }))

      setEvents(mapped)
    }

    fetchEvents()
  }, [])

  const filtered = activeCategory
    ? events.filter((e) => e.category === activeCategory)
    : events

  return (
<section className="pb-8" id="discover">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Popularne wydarzenia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wybrane dla Ciebie na podstawie lokalizacji i zainteresowań
          </p>
        </div>
        <Button variant="ghost" className="hidden gap-2 text-sm font-medium text-primary hover:text-primary">
          Zobacz wszystkie <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Filtrowanie kategorii */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Wszystkie
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.length > 0 ? (
          filtered.map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <p className="col-span-4 py-12 text-center text-muted-foreground">
            Brak wydarzeń w tej kategorii.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <Button variant="outline" className="gap-2 text-sm font-medium text-primary">
          Zobacz wszystkie <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}
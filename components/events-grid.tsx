"use client"

import { useState, useEffect } from "react"
import { EventCard, type EventData } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function EventsGrid() {
  const [events, setEvents] = useState<EventData[]>([])

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Błąd message:', error.message)
        console.error('Błąd code:', error.code)
        console.error('Błąd details:', error.details)
        console.error('Błąd hint:', error.hint)
        return
      }

      console.log('Dane z Supabase:', data)

      const mapped = (data || []).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        date: e.start_date ? new Date(e.start_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        city: e.city,
        image: e.image || '/images/event-concert.jpg',
        interested: e.interested_count || 0,
        category: e.category || 'Inne',
        price: e.price ? `od ${e.price} zł` : 'Wstęp wolny',
      }))

      setEvents(mapped)
    }

    fetchEvents()
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8" id="discover">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Popularne wydarzenia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wybrane dla Ciebie na podstawie lokalizacji i zainteresowań
          </p>
        </div>
        <Button variant="ghost" className="hidden gap-2 text-sm font-medium text-primary hover:text-primary">
          Zobacz wszystkie
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <Button variant="outline" className="gap-2 text-sm font-medium text-primary">
          Zobacz wszystkie
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}
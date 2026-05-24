"use client"

import { useSearchParams } from "next/navigation"
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
  const [centerLat, setCenterLat] = useState<number | null>(null)
  const [centerLng, setCenterLng] = useState<number | null>(null)
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("q")?.toLowerCase() || ""
  const timeFilter = searchParams.get("time") || ""
  const cityParam = searchParams.get("city") || ""
  const radiusParam = parseFloat(searchParams.get("radius") || "25")
  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })
      if (error) { console.error('Błąd:', error.message); return }
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
        latitude: e.latitude ? parseFloat(e.latitude) : null,
        longitude: e.longitude ? parseFloat(e.longitude) : null,
      }))
      setEvents(mapped)
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (latParam && lngParam) {
      setCenterLat(parseFloat(latParam))
      setCenterLng(parseFloat(lngParam))
      return
    }
    if (cityParam) {
      fetch("/api/geocode?q=" + encodeURIComponent(cityParam))
        .then(r => r.json())
        .then(d => {
          if (d[0]) {
            setCenterLat(parseFloat(d[0].lat))
            setCenterLng(parseFloat(d[0].lon))
          }
        })
        .catch(() => {})
    } else {
      setCenterLat(null)
      setCenterLng(null)
    }
  }, [cityParam, latParam, lngParam])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)
  const weekendStart = new Date(today)
  weekendStart.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7))
  const weekendEnd = new Date(weekendStart)
  weekendEnd.setDate(weekendStart.getDate() + 1)

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const filtered = events.filter((e: any) => {
    if (activeCategory && e.category !== activeCategory) return false
    if (searchQuery) {
      const haystack = `${e.title} ${e.city} ${e.category}`.toLowerCase()
      if (!haystack.includes(searchQuery)) return false
    }
    if (timeFilter === "dzis") {
      const d = new Date(e.start_date); if (d < today || d >= tomorrow) return false
    }
    if (timeFilter === "jutro") {
      const d = new Date(e.start_date); if (d < tomorrow || d >= dayAfterTomorrow) return false
    }
    if (timeFilter === "weekend") {
      const d = new Date(e.start_date); if (d < weekendStart || d > weekendEnd) return false
    }
    if (timeFilter === "bezplatne") {
      if (e.price !== "Wstęp wolny") return false
    }
    if (centerLat && centerLng && cityParam) {
      if (!e.latitude || !e.longitude) return false
      const dist = haversine(centerLat, centerLng, e.latitude, e.longitude)
      if (dist > radiusParam) return false
    }
    return true
  })

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
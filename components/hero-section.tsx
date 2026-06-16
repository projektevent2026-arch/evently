"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface HeroEvent {
  id: string
  title: string
  start_date: string
  start_time: string | null
  venue_name: string | null
  location_name: string | null
  cover_image_url: string | null
  image_url: string | null
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"

function formatHeroDate(dateStr: string, timeStr: string | null): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  const time = timeStr?.slice(0, 5) ?? ''

  if (d.toDateString() === today.toDateString()) return `DZIŚ${time ? ` · ${time}` : ''}`
  if (d.toDateString() === tomorrow.toDateString()) return `JUTRO${time ? ` · ${time}` : ''}`
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }) + (time ? ` · ${time}` : '')
}

export function HeroSection() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const router = useRouter()
  const [events, setEvents] = useState<HeroEvent[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, start_date, start_time, venue_name, location_name, cover_image_url, image_url")
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .limit(5)
      .then(({ data }) => { if (data?.length) setEvents(data) })
  }, [])

  // Auto-rotate co 5 sekund
  useEffect(() => {
    if (events.length < 2) return
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % events.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [events.length])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    const time = searchParams.get("time")
    if (time) params.set("time", time)
    router.push(`/?${params.toString()}`)
  }

  const prev = () => setCurrent(c => (c - 1 + events.length) % events.length)
  const next = () => setCurrent(c => (c + 1) % events.length)

  const event = events[current]
  const img = event?.cover_image_url || event?.image_url || FALLBACK_IMAGE
  const venue = event?.venue_name || event?.location_name || ''

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">

          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {searchParams.get("city") || "Suwałki"}
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Co dzieje się<br />
              <span className="text-primary">w pobliżu?</span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Odkryj najlepsze wydarzenia w swojej okolicy i spędź czas tak, jak lubisz.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Szukaj wydarzeń, artystów, miejsc..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Szukaj
              </button>
            </form>
          </div>

          {/* Carousel */}
          <div className="relative hidden lg:block">
            <div className="relative h-[420px] w-full overflow-hidden rounded-3xl">
              <img
                key={current}
                src={img}
                alt={event?.title ?? "Wydarzenie"}
                className="h-full w-full object-cover transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-3xl" />

              {/* Event info */}
              {event && (
                <div
                  className="absolute bottom-6 left-6 right-6 rounded-2xl bg-background/90 backdrop-blur-sm p-4 border border-border/50 cursor-pointer hover:bg-background/95 transition-colors"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  <p className="text-xs font-medium text-primary mb-1">
                    {formatHeroDate(event.start_date, event.start_time)}
                  </p>
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{event.title}</p>
                  {venue && <p className="text-xs text-muted-foreground mt-0.5">{venue}</p>}
                </div>
              )}

              {/* Nawigacja */}
              {events.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </button>

                  {/* Dots */}
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    {events.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === current ? 'bg-white w-4' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
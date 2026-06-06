"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { EventCard, type EventData } from "@/components/event-card"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["culture", "music", "food", "sport", "family", "technology"]
const CATEGORY_LABELS: Record<string, string> = {
  culture: "Kultura", music: "Muzyka", food: "Jedzenie",
  sport: "Sport", family: "Rodzinne", technology: "Technologia",
}

const DATE_FILTERS = [
  { id: "all",      label: "Wszystkie" },
  { id: "today",    label: "Dziś" },
  { id: "tomorrow", label: "Jutro" },
  { id: "weekend",  label: "Weekend" },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isToday(d: string) { return new Date(d).toDateString() === new Date().toDateString() }
function isTomorrow(d: string) {
  const t = new Date(); t.setDate(t.getDate() + 1)
  return new Date(d).toDateString() === t.toDateString()
}
function isWeekend(d: string) { const day = new Date(d).getDay(); return day === 0 || day === 6 }
function isOnDate(d: string, target: string) {
  return new Date(d).toDateString() === new Date(target).toDateString()
}

export function EventsGrid() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventData[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState("all")
  const [customDate, setCustomDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

  const q = searchParams.get("q") || ""
  const filterLat = parseFloat(searchParams.get("lat") || "")
  const filterLng = parseFloat(searchParams.get("lng") || "")
  const filterRadius = parseFloat(searchParams.get("radius") || "25")
  const hasLocationFilter = !isNaN(filterLat) && !isNaN(filterLng)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: true })

      if (error) { console.error(error); setLoading(false); return }

      const mapped = (data || [])
        .filter((e) => {
          if (!hasLocationFilter) return true
          if (!e.latitude || !e.longitude) return true
          return haversineKm(filterLat, filterLng, e.latitude, e.longitude) <= filterRadius
        })
        .map((e) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          date: e.start_date ? new Date(e.start_date).toLocaleDateString("pl-PL", {
            day: "numeric", month: "long", year: "numeric",
          }) : "",
          start_date: e.start_date,
          city: e.city,
          image: e.cover_image_url || "/images/event-concert.jpg",
          interested: e.interested_count || 0,
          category: e.category || "Inne",
          price: e.is_free ? "Wstęp wolny" : e.price_from ? `od ${e.price_from} zł` : "Wstęp wolny",
        }))

      setEvents(mapped)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: attendance } = await supabase
          .from("event_attendees")
          .select("event_id")
          .eq("user_id", session.user.id)
        if (attendance) {
          setAttendingIds(new Set(attendance.map((a) => a.event_id)))
        }
      }

      setLoading(false)
    }
    fetchEvents()
  }, [filterLat, filterLng, filterRadius])

  const filtered = events.filter((e) => {
    const matchQ = q
      ? e.title.toLowerCase().includes(q.toLowerCase()) ||
        e.city?.toLowerCase().includes(q.toLowerCase())
      : true
    const matchCat = activeCategory ? e.category === activeCategory : true
    const matchDate = (() => {
      if (!e.start_date) return true
      if (activeDate === "today") return isToday(e.start_date)
      if (activeDate === "tomorrow") return isTomorrow(e.start_date)
      if (activeDate === "weekend") return isWeekend(e.start_date)
      if (activeDate === "custom" && customDate) return isOnDate(e.start_date, customDate)
      return true
    })()
    return matchQ && matchCat && matchDate
  })

  return (
    <section className="pb-8" id="discover">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {q ? `Wyniki dla "${q}"` : "Nadchodzące wydarzenia"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "wydarzenie" : filtered.length < 5 ? "wydarzenia" : "wydarzeń"}
          {hasLocationFilter && ` w promieniu ${filterRadius} km`}
        </p>
      </div>

      {/* Kategorie */}
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

      {/* Filtry dat */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {DATE_FILTERS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setActiveDate(d.id); setCustomDate("") }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              activeDate === d.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {d.label}
          </button>
        ))}

{/* Kalendarz */}
<input
  type="date"
  value={customDate}
  onChange={e => { setCustomDate(e.target.value); setActiveDate("custom") }}
  title="Wybierz datę"
  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer ${
    activeDate === "custom"
      ? "border-primary bg-primary/10 text-primary"
      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
  }`}
  style={{ colorScheme: "dark" }}
/>

      {/* Grid */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <p className="col-span-4 py-12 text-center text-muted-foreground">Ładowanie...</p>
        ) : filtered.length > 0 ? (
          filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              initialGoing={attendingIds.has(String(event.id))}
            />
          ))
        ) : (
          <div className="col-span-4 py-16 text-center">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-lg font-semibold text-foreground mb-2">Brak wydarzeń</p>
            <p className="text-sm text-muted-foreground">
              {hasLocationFilter
                ? `Nie ma wydarzeń w promieniu ${filterRadius} km.`
                : "Nie ma wydarzeń spełniających kryteria."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
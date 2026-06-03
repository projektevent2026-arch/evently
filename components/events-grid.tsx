"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { EventCard, type EventData } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["culture", "music", "food", "sport", "family", "technology"]
const CATEGORY_LABELS: Record<string, string> = {
  culture: "Kultura", music: "Muzyka", food: "Jedzenie",
  sport: "Sport", family: "Rodzinne", technology: "Technologia",
}

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

function getDateRange(time: string | null): { from?: string; to?: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (time === "dzis") {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
  }
  if (time === "jutro") {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2)
    return { from: tomorrow.toISOString(), to: dayAfter.toISOString() }
  }
  if (time === "weekend") {
    const day = today.getDay()
    const daysToSat = day === 6 ? 0 : (6 - day)
    const sat = new Date(today); sat.setDate(sat.getDate() + daysToSat)
    const mon = new Date(sat); mon.setDate(mon.getDate() + 2)
    return { from: sat.toISOString(), to: mon.toISOString() }
  }
  return {}
}

export function EventsGrid() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventData[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

  const q = searchParams.get("q") || ""
  const time = searchParams.get("time")
  const isFree = time === "bezplatne"
  const filterLat = parseFloat(searchParams.get("lat") || "")
  const filterLng = parseFloat(searchParams.get("lng") || "")
  const filterRadius = parseFloat(searchParams.get("radius") || "25")
  const hasLocationFilter = !isNaN(filterLat) && !isNaN(filterLng)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: true })

      const { from, to } = getDateRange(isFree ? null : time)
      if (from) query = query.gte("start_date", from)
      if (to) query = query.lt("start_date", to)
      if (isFree) query = query.eq("is_free", true)

      const { data, error } = await query
      if (error) { console.error(error); setLoading(false); return }

      const mapped = (data || [])
        .filter((e) => {
          if (!hasLocationFilter) return true
          if (!e.latitude || !e.longitude) return true
          const dist = haversineKm(filterLat, filterLng, e.latitude, e.longitude)
          return dist <= filterRadius
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
          price: e.is_free ? "Wstep wolny" : e.price_from ? `od ${e.price_from} zl` : "Wstep wolny",
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
  }, [time, isFree, filterLat, filterLng, filterRadius])

  const filtered = events.filter((e) => {
    const matchQ = q
      ? e.title.toLowerCase().includes(q.toLowerCase()) ||
        e.city?.toLowerCase().includes(q.toLowerCase())
      : true
    const matchCat = activeCategory ? e.category === activeCategory : true
    return matchQ && matchCat
  })

  return (
    <section className="pb-8" id="discover">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {q ? `Wyniki dla "${q}"` : "Nadchodzace wydarzenia"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "wydarzenie" : filtered.length < 5 ? "wydarzenia" : "wydarzen"}
            {hasLocationFilter && ` w promieniu ${filterRadius} km`}
          </p>
        </div>
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
        {loading ? (
          <p className="col-span-4 py-12 text-center text-muted-foreground">Ladowanie...</p>
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
            <p className="text-lg font-semibold text-foreground mb-2">Brak wydarzen</p>
            <p className="text-sm text-muted-foreground">
              {hasLocationFilter
                ? `Nie ma wydarzen w promieniu ${filterRadius} km. Sprobuj zwiekszyc promien.`
                : "Nie ma wydarzen spelniajacych kryteria."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
"use client"

import { matchesQuery } from '@/lib/searchEvent'
import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { EventCard, type EventData } from "@/components/event-card"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["kultura", "muzyka", "sport", "festyny"]
const CATEGORY_LABELS: Record<string, string> = {
  kultura: "Kultura", culture: "Kultura",
  muzyka: "Muzyka", music: "Muzyka",
  sport: "Sport",
  festyny: "Festyny", folk: "Festyny", family: "Festyny",
}

const DATE_FILTERS = [
  { id: "all",      label: "Wszystkie" },
  { id: "today",    label: "Dziś" },
  { id: "tomorrow", label: "Jutro" },
  { id: "weekend",  label: "Weekend" },
]

// Zwraca początek dzisiejszego dnia (00:00) — event z dzisiejszą datą ma zostać widoczny.
function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Event jest "aktualny", jeśli jeszcze się nie zakończył.
function isUpcoming(start_date?: string | null, end_date?: string | null): boolean {
  const today = startOfToday()
  const ref = end_date || start_date
  if (!ref) return true
  const refDay = new Date(ref)
  refDay.setHours(0, 0, 0, 0)
  return refDay >= today
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

function isToday(d: string) { return new Date(d).toDateString() === new Date().toDateString() }
function isTomorrow(d: string) {
  const t = new Date(); t.setDate(t.getDate() + 1)
  return new Date(d).toDateString() === t.toDateString()
}

// Zakres NAJBLIŻSZEGO weekendu: piątek 00:00 -> niedziela 23:59.
function thisWeekendRange(): [Date, Date] {
  const now = new Date()
  const day = now.getDay()
  const offsetToFriday = day === 0 ? -2 : 5 - day
  const start = new Date(now)
  start.setDate(now.getDate() + offsetToFriday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 2)
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

function isThisWeekend(d: string): boolean {
  const [start, end] = thisWeekendRange()
  const t = new Date(d).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function isOnDate(d: string, target: string) {
  return new Date(d).toDateString() === new Date(target).toDateString()
}

function normalizeCategory(cat: string | null): string {
  if (!cat) return ""
  const c = cat.toLowerCase()
  if (c === "kultura" || c === "culture") return "kultura"
  if (c === "muzyka" || c === "music") return "muzyka"
  if (c === "sport") return "sport"
  if (c === "festyny" || c === "folk" || c === "family" || c === "rodzinne") return "festyny"
  return c
}

// ─────────────────────────────────────────────────────────────
// FETCH z timeoutem + retry — ten sam wzorzec co w MobileHome.
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

async function fetchPublishedEvents(): Promise<any[]> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: true })
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) throw error
      return data ?? []
    } catch (err) {
      clearTimeout(timeoutId)
      lastErr = err
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
      }
    }
  }

  throw lastErr ?? new Error("fetch events failed")
}

export function EventsGrid() {
  const searchParams = useSearchParams()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [events, setEvents] = useState<EventData[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState("all")
  const [customDate, setCustomDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

  const q = searchParams.get("q") || ""
  const filterLat = parseFloat(searchParams.get("lat") || "")
  const filterLng = parseFloat(searchParams.get("lng") || "")
  const filterRadius = parseFloat(searchParams.get("radius") || "25")
  const hasLocationFilter = !isNaN(filterLat) && !isNaN(filterLng)

  function openCalendar() {
    try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
  }

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await fetchPublishedEvents()

      const mapped = data
        .filter((e) => isUpcoming(e.start_date, e.end_date))
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
          start_time: e.start_time ?? null,
          city: e.city,
          image: e.cover_image_url || "/images/event-concert.jpg",
          image_url: e.image_url || null,
          interested: e.interested_count || 0,
          category: e.category || "Inne",
          price: e.is_free ? "Wstęp wolny" : e.price_from ? `od ${e.price_from} zł` : "Wstęp wolny",
          // Pola tylko do wyszukiwania — nie renderowane w kartach.
          description: e.description ?? null,
          short_description: e.short_description ?? null,
          venue_name: e.venue_name ?? null,
          organizer_name: e.organizer_name ?? null,
          address: e.address ?? null,
          schedule: e.schedule ?? null,
        }))

      setEvents(mapped)

      // Pobranie sesji + RSVP jest DRUGORZĘDNE — jego błąd NIE ma pokazywać ekranu awarii.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: attendance } = await supabase
            .from("event_attendees").select("event_id").eq("user_id", session.user.id)
          if (attendance) setAttendingIds(new Set(attendance.map((a) => a.event_id)))
        }
      } catch (attErr) {
        console.warn("[Evently] Nie udało się pobrać listy RSVP (pomijam):", attErr)
      }
    } catch (err) {
      console.error("[Evently] Nie udało się pobrać wydarzeń:", err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [filterLat, filterLng, filterRadius, hasLocationFilter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filtered = events.filter((e) => {
    const matchQ = q ? matchesQuery(e, q) : true
    const matchCat = activeCategory
      ? normalizeCategory(e.category) === activeCategory
      : true
    const matchDate = (() => {
      if (!e.start_date) return true
      if (activeDate === "today") return isToday(e.start_date)
      if (activeDate === "tomorrow") return isTomorrow(e.start_date)
      if (activeDate === "weekend") return isThisWeekend(e.start_date)
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
        <button
          type="button"
          onClick={openCalendar}
          className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
            activeDate === "custom"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          📅 {activeDate === "custom" && customDate
            ? new Date(customDate).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })
            : "Kalendarz"}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="sr-only"
          tabIndex={-1}
          value={customDate}
          onChange={e => { setCustomDate(e.target.value); setActiveDate("custom") }}
        />
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <p className="col-span-4 py-12 text-center text-muted-foreground">Ładowanie...</p>
        ) : loadError ? (
          <div className="col-span-4 py-16 text-center">
            <p className="text-4xl mb-4">📡</p>
            <p className="text-lg font-semibold text-foreground mb-2">Nie udało się załadować wydarzeń</p>
            <p className="text-sm text-muted-foreground mb-5">Sprawdź połączenie i spróbuj ponownie</p>
            <button
              onClick={loadEvents}
              className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((event) => (
            <EventCard key={event.id} event={event} initialGoing={attendingIds.has(String(event.id))} />
          ))
        ) : (
          <div className="col-span-4 py-16 text-center">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-lg font-semibold text-foreground mb-2">Brak wydarzeń</p>
            <p className="text-sm text-muted-foreground">
              {hasLocationFilter ? `Nie ma wydarzeń w promieniu ${filterRadius} km.` : "Nie ma wydarzeń spełniających kryteria."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
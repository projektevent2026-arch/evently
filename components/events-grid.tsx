"use client"

import { matchesQuery } from '@/lib/searchEvent'
import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { EventCard, type EventData } from "@/components/event-card"
import { supabase } from "@/lib/supabase"
import { normalizeCategory, CATEGORY_LABELS } from "@/lib/eventCategory"
import { isToday, isTomorrow, isThisWeekend, isSameLocalDate, haversineKm } from "@/lib/eventFormat"

const CATEGORIES = ["kultura", "muzyka", "sport", "festyny"]

const DATE_FILTERS = [
  { id: "all",      label: "Wszystkie" },
  { id: "today",    label: "Dziś" },
  { id: "tomorrow", label: "Jutro" },
  { id: "weekend",  label: "Weekend" },
]

// ─────────────────────────────────────────────────────────────
// FETCH z timeoutem + retry — ten sam wzorzec co w MobileHome.
// Pytamy współdzielony, cache'owany endpoint /api/events (revalidate: 60)
// — ten sam co MobileHome i EventMap. Używane TYLKO przy refetchu
// (zmiana filtra/lokalizacji) — pierwsze wczytanie idzie przez
// initialEvents z SSR, patrz app/page.tsx.
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

async function fetchPublishedEvents(): Promise<any[]> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/events', { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('Błąd pobierania: ' + res.status)
      return await res.json()
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

// Filtrowanie po lokalizacji (haversine) + mapowanie surowych wierszy z
// published_events_with_next_date na EventData używane przez <EventCard>.
// Wydzielone z loadEvents 2026-09-22, żeby dokładnie ta sama logika dała
// się użyć zarówno przy pierwszym renderze (initialEvents z SSR) jak i
// przy każdym kolejnym refetchu — bez tego mielibyśmy dwie kopie tego
// samego mapowania, dokładnie ten wzorzec, który już raz narobił bugów
// przy promieniu wyszukiwania.
function mapEvents(
  data: any[],
  params: { filterLat: number; filterLng: number; filterRadius: number; hasLocationFilter: boolean; q: string }
) {
  const { filterLat, filterLng, filterRadius, hasLocationFilter, q } = params
  return data
    .filter((e) => {
      if (q) return true
      if (!hasLocationFilter) return true
      if (!e.latitude || !e.longitude) return true
      return haversineKm(filterLat, filterLng, e.latitude, e.longitude) <= filterRadius
    })
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      date: e.next_date ? new Date(e.next_date).toLocaleDateString("pl-PL", {
        day: "numeric", month: "long", year: "numeric",
      }) : "",
      start_date: e.next_date,
      start_time: e.next_start_time ?? null,
      schedule_type: e.schedule_type,
      city: e.city,
      image: e.cover_image_url || "/images/event-concert.jpg",
      image_url: e.image_url || null,
      interested: e.interested_count || 0,
      category: e.category || "Inne",
      // Na kartach w siatce pokazujemy tylko sygnał darmowe/płatne, NIE
      // konkretną kwotę — pełna cena ("Od 100 PLN") jest dopiero na
      // stronie szczegółów wydarzenia (liczona tam niezależnie, patrz
      // EventPageClient.tsx). To celowy podział: karta ma dać szybki
      // sygnał przy przeglądaniu, dokładna liczba jest potrzebna dopiero
      // przy podejmowaniu decyzji "idę / nie idę".
      price: e.is_free ? "Wstęp wolny" : "Wstęp płatny",
      is_free: e.is_free,
      // Pola tylko do wyszukiwania — nie renderowane w kartach.
      description: e.description ?? null,
      short_description: e.short_description ?? null,
      venue_name: e.venue_name ?? null,
      organizer_name: e.organizer_name ?? null,
      address: e.address ?? null,
      schedule: e.schedule ?? null,
    }))
}

export function EventsGrid({ initialEvents }: { initialEvents?: any[] }) {
  const searchParams = useSearchParams()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const q = searchParams.get("q") || ""
  // 2026-09-21: bez tego, gdy URL nie miał jeszcze lat/lng (zupełnie
  // świeże wejście, zanim ktokolwiek kliknął cokolwiek w LocationSidebar),
  // hasLocationFilter wychodziło false i KAŻDE wydarzenie przechodziło
  // filtr, niezależnie od odległości — mimo że panel z boku i tak
  // POKAZYWAŁ "25 km od Suwałki" jako aktywny filtr. Wygląd i rzeczywiste
  // filtrowanie były rozjechane. Domyślne współrzędne Suwałk (te same co
  // w location-sidebar.tsx i MobileHome.tsx) naprawiają to u źródła.
  const SUWALKI_LAT = 54.1113
  const SUWALKI_LNG = 22.9302
  const urlLat = parseFloat(searchParams.get("lat") || "")
  const urlLng = parseFloat(searchParams.get("lng") || "")
  const filterLat = isNaN(urlLat) ? SUWALKI_LAT : urlLat
  const filterLng = isNaN(urlLng) ? SUWALKI_LNG : urlLng
  const filterRadius = parseFloat(searchParams.get("radius") || "25")
  const hasLocationFilter = !isNaN(filterLat) && !isNaN(filterLng)

  // Pierwszy render: jeśli mamy initialEvents z SSR (app/page.tsx), od
  // razu je zmapuj i pokaż — zero pustego stanu "Ładowanie..." na starcie.
  // Jeśli SSR się wywalił (initialEvents === undefined), zostaje pusta
  // tablica i normalny fetch po stronie klienta jak dawniej.
  const [events, setEvents] = useState<EventData[]>(() =>
    initialEvents ? mapEvents(initialEvents, { filterLat, filterLng, filterRadius, hasLocationFilter, q }) : []
  )
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState("all")
  const [customDate, setCustomDate] = useState("")
  // "loading" = PIERWSZE wczytanie w ogóle (siatka jeszcze pusta) — jedyny
  // moment, w którym pokazujemy pełnoekranowy napis "Ładowanie...".
  // "refreshing" = KAŻDE kolejne odświeżenie (zmiana filtra, lokalizacji,
  // powrót na stronę) — siatka zostaje widoczna, tylko dyskretny wskaźnik
  // obok licznika.
  const [loading, setLoading] = useState(!initialEvents)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnceRef = useRef(!!initialEvents)
  // Gdy initialEvents przyszły z SSR, pierwsze wywołanie loadEvents (z
  // useEffect poniżej) NIE powinno robić kolejnego fetcha — dane już są.
  // Skip działa tylko RAZ; każda kolejna zmiana filtra/lokalizacji i tak
  // wywoła prawdziwy fetch, jak dawniej.
  const skipInitialFetchRef = useRef(!!initialEvents)
  const [loadError, setLoadError] = useState(false)
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

  function openCalendar() {
    try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
  }

  // Sesja + RSVP wydzielone do OSOBNEJ funkcji, uruchamianej BEZ czekania
  // (fire-and-forget) — wcześniej to zapytanie siedziało w tym samym
  // try/finally co główny fetch wydarzeń, więc setLoading(false) czekało
  // aż SKOŃCZY SIĘ TAKŻE sesja/RSVP, mimo że lista wydarzeń była już
  // gotowa.
  function loadAttendance() {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) return
        return supabase.from("event_attendees").select("event_id").eq("user_id", session.user.id)
      })
      .then((res) => {
        if (res?.data) setAttendingIds(new Set(res.data.map((a) => a.event_id)))
      })
      .catch((attErr) => {
        console.warn("[Evently] Nie udało się pobrać listy RSVP (pomijam):", attErr)
      })
  }

  const loadEvents = useCallback(async () => {
    if (skipInitialFetchRef.current) {
      // Dane już są z SSR — tylko dociągnij sesję/RSVP, bez fetcha.
      skipInitialFetchRef.current = false
      hasLoadedOnceRef.current = true
      loadAttendance()
      return
    }

    if (hasLoadedOnceRef.current) setRefreshing(true)
    else setLoading(true)
    setLoadError(false)
    try {
      const data = await fetchPublishedEvents()
      const mapped = mapEvents(data, { filterLat, filterLng, filterRadius, hasLocationFilter, q })

      setEvents(mapped)

      // Pobranie sesji + RSVP jest DRUGORZĘDNE — jego błąd NIE ma pokazywać ekranu awarii.
      // To zapytanie ZOSTAJE bezpośrednio do Supabase — zależy od sesji zalogowanego
      // użytkownika, więc nie da się go cache'ować wspólnie przez /api/events.
      setLoading(false)
      setRefreshing(false)
      hasLoadedOnceRef.current = true

      loadAttendance()
    } catch (err) {
      console.error("[Evently] Nie udało się pobrać wydarzeń:", err)
      setLoadError(true)
      setLoading(false)
      setRefreshing(false)
      hasLoadedOnceRef.current = true
    }
  }, [filterLat, filterLng, filterRadius, hasLocationFilter, q])

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
      if (activeDate === "custom" && customDate) return isSameLocalDate(e.start_date, customDate)
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
          {refreshing && <span className="ml-2 text-xs opacity-70">· odświeżam…</span>}
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
            {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
          </button>
        ))}
      </div>

      {/* Filtry dat */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {DATE_FILTERS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setActiveDate(d.id); setCustomDate("") }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeDate === d.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {d.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openCalendar}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeDate === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
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
        ) : loadError && events.length === 0 ? (
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
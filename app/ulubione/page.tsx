'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useFavorites } from '@/hooks/useFavorites'
import { fmtClock } from '@/lib/eventFormat'
import type { EventDateRow } from '@/lib/getEventWithDates'

interface Event {
  id: string
  slug: string | null
  title: string
  start_date: string
  end_date: string | null
  // UWAGA: start_time/end_time jako osobne kolumny w tabeli `events` NAJPEWNIEJ
  // NIE ISTNIEJĄ — przy zapisie (AdminWydarzenie.tsx, dodaj-wydarzenie/page.tsx)
  // godzina jest zawsze sklejana w start_date/end_date, nigdy wysyłana osobno.
  // Te dwa pola trzymamy tu tylko na wypadek, gdyby select('*') je zwrócił
  // (nieszkodliwe), ale NIE są źródłem prawdy — patrz effectiveInfo() niżej,
  // która dla wydarzeń bez event_dates czyta godzinę z start_date przez
  // fmtClock(), tym samym mechanizmem co MobileEventDetail.tsx/EventPageClient.tsx.
  // Osobne, realne kolumny start_time/end_time ma tabela event_dates (terminy
  // cykliczne) — to inny model, nie mylić.
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  address: string | null
  city: string | null
  category: string | null
  image_url: string | null
  cover_image_url: string | null
  is_free: boolean
  event_dates?: EventDateRow[]
}

const MONTH_PL = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU']

const CAT_COLORS: Record<string, string> = {
  festyny: 'bg-amber-500 text-black',
  kultura: 'bg-purple-500 text-white',
  muzyka:  'bg-green-500 text-black',
  sport:   'bg-blue-500 text-white',
}

const CAT_LABELS: Record<string, string> = {
  festyny: 'Festyny', kultura: 'Kultura', muzyka: 'Muzyka', sport: 'Sport',
}

function normalizeCategory(raw: string | null): string {
  const c = (raw ?? '').toLowerCase().trim()
  if (c === 'kultura' || c === 'culture') return 'kultura'
  if (c === 'muzyka' || c === 'music') return 'muzyka'
  if (c === 'sport') return 'sport'
  return 'festyny'
}

// Polska odmiana: 1 wydarzenie / 2-4 wydarzenia / 5+ wydarzeń (i 12-14 zawsze "wydarzeń")
function eventWord(n: number): string {
  if (n === 1) return 'wydarzenie'
  const lastDigit = n % 10
  const lastTwo = n % 100
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'wydarzenia'
  return 'wydarzeń'
}
function upcomingWord(n: number): string {
  return n === 1 ? 'nadchodzące' : 'nadchodzących'
}

// --- Daty: wyłącznie na stringach "YYYY-MM-DD" w czasie LOKALNYM, nigdy
// przez toISOString() (to konwertuje na UTC i cofa datę o dzień wieczorem
// w Polsce — dokładnie ten bug, który złapaliśmy w EventDatesList.tsx). ---

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr(): string {
  return localDateStr(new Date())
}

function addDaysStr(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

// Ostatni dzień KALENDARZOWEGO miesiąca, do którego należy `base`.
function endOfMonthStr(base: string): string {
  const d = new Date(base + 'T12:00:00')
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return localDateStr(end)
}

// Efektywny termin wydarzenia do wyświetlenia/grupowania:
// - jeśli event ma wiersze w event_dates (cykliczny) -> najbliższy NADCHODZĄCY
//   termin, a jeśli wszystkie już minęły -> ostatni z przeszłych (ten sam
//   wzorzec co nextTermInfo() w lib/eventFormat.tsx). Godzina stąd pochodzi
//   z realnych kolumn event_dates.start_time/end_time.
// - jeśli event_dates puste (starszy rekord sprzed wprowadzenia tej tabeli)
//   -> start_date/end_date z events, a godzina wyciągana przez fmtClock()
//   z tych samych pól — NIE z e.start_time/e.end_time, bo tych kolumn
//   najpewniej nie ma (patrz komentarz przy interfejsie Event wyżej).
function effectiveInfo(e: Event): { date: string; endDate: string; time: string | null; endTime: string | null } {
  const dates = e.event_dates
  if (dates && dates.length > 0) {
    const today = todayStr()
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = sorted.filter(d => d.date.slice(0, 10) >= today)
    const chosen = upcoming.length > 0 ? upcoming[0] : sorted[sorted.length - 1]
    const dateOnly = chosen.date.slice(0, 10)
    return { date: dateOnly, endDate: dateOnly, time: chosen.start_time, endTime: chosen.end_time }
  }
  return {
    date: e.start_date.slice(0, 10),
    endDate: (e.end_date || e.start_date).slice(0, 10),
    time: fmtClock(e.start_date) || null,
    endTime: fmtClock(e.end_date) || null,
  }
}

function dateBadgeParts(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = todayStr()
  const tomorrow = addDaysStr(today, 1)
  return {
    day: d.getDate(),
    month: MONTH_PL[d.getMonth()],
    isToday: dateStr === today,
    isTomorrow: dateStr === tomorrow,
  }
}

// Grupowanie po CZASIE (nie po miejscu) — ulubione to lista „co mnie czeka",
// więc najważniejsze jest, co jest najbliżej i czego nie przegapić.
// "week" = najbliższe 7 dni (rolling). "month" = do końca BIEŻĄCEGO miesiąca
// kalendarzowego (nie rolling 30 dni — inaczej wydarzenie z września wpada
// do "W tym miesiącu" jeszcze w sierpniu, co jest sprzeczne z etykietą).
type Bucket = 'week' | 'month' | 'later' | 'past'

const BUCKET_LABELS: Record<Bucket, string> = {
  week:  'W tym tygodniu',
  month: 'W tym miesiącu',
  later: 'Później',
  past:  'Minione',
}

function bucketFor(info: ReturnType<typeof effectiveInfo>): Bucket {
  const today = todayStr()
  if (info.endDate < today) return 'past'

  const weekEnd = addDaysStr(today, 7)
  const monthEnd = endOfMonthStr(today)

  if (info.date <= weekEnd) return 'week'
  if (info.date <= monthEnd) return 'month'
  return 'later'
}

function EventTile({ event, onRemove }: { event: Event; onRemove: (id: string) => void }) {
  const cat = normalizeCategory(event.category)
  const info = effectiveInfo(event)
  const { day, month, isToday, isTomorrow } = dateBadgeParts(info.date)
  const img = event.cover_image_url || event.image_url
  const time = info.time?.slice(0, 5)
  const place = event.venue_name || event.address || event.city

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-colors hover:border-green-500/40">
      <Link href={`/events/${event.slug || event.id}`} className="block">
        {/* Obrazek — zmniejszony o ~15% wysokości względem oryginału (16/10 -> 16/8.5),
            żeby przy kilku ulubionych mieściło się więcej bez przewijania. */}
        <div className="relative aspect-[16/8.5] overflow-hidden bg-zinc-800">
          {img && (
            <img src={img} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          <span className={`absolute left-3 top-3 text-[9px] font-black px-2 py-1 rounded-lg ${CAT_COLORS[cat]}`}>
            {CAT_LABELS[cat].toUpperCase()}
          </span>

          {/* Data */}
          <div className={`absolute left-3 bottom-3 flex flex-col items-center px-2.5 py-1 rounded-xl min-w-[44px] ${
            isToday ? 'bg-green-500' : isTomorrow ? 'bg-yellow-400' : 'bg-black/70 backdrop-blur-sm'
          }`}>
            <span className={`text-[15px] font-black leading-none ${
              isToday || isTomorrow ? 'text-black' : 'text-white'
            }`}>
              {isToday ? 'DZIŚ' : isTomorrow ? 'JUTRO' : day}
            </span>
            {!isToday && !isTomorrow && (
              <span className="text-[9px] font-bold text-zinc-300 leading-none mt-0.5">{month}</span>
            )}
          </div>
        </div>

        {/* Treść */}
        <div className="p-3">
          <p className="text-[14px] font-black text-white leading-tight mb-1.5 line-clamp-2">
            {event.title}
          </p>
          {place && (
            <p className="text-[11px] text-zinc-400 line-clamp-1">📍 {place}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {time && (
              <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">
                🕐 {time}
              </span>
            )}
            {event.is_free && (
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">
                Wstęp wolny
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Usuń z ulubionych — lekko mniejsze i mniej agresywne wizualnie (było w-8 h-8) */}
      <button
        onClick={() => onRemove(event.id)}
        aria-label="Usuń z ulubionych"
        className="absolute right-3 top-3 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center text-[13px] shadow-md hover:bg-red-600 transition-colors"
      >
        ♥
      </button>
    </div>
  )
}

export default function UlubionePage() {
  const { favorites, loaded, toggleFavorite, pruneFavorites } = useFavorites()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) return

    async function load() {
      if (favorites.length === 0) {
        setEvents([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, event_dates(id, date, start_time, end_time)')
          .in('id', favorites)
          if (error) throw error

          // Sortowanie po EFEKTYWNYM terminie (nie po surowym start_date) —
          // dla eventów cyklicznych start_date to często pierwszy, dawno
          // miniony termin, więc sortowanie po nim myliłoby kolejność kart.
          const sorted = [...(data ?? [])].sort((a, b) =>
            effectiveInfo(a as Event).date.localeCompare(effectiveInfo(b as Event).date)
          ) as Event[]

          setEvents(sorted)
          // Wyczyść localStorage z ID eventów, które już nie istnieją w bazie LUB
          // już minęły — żeby licznik w Navbar zgadzał się z tym, co strona
          // faktycznie pokazuje (tylko nadchodzące).
          const upcoming = sorted.filter(e => bucketFor(effectiveInfo(e)) !== 'past')
          pruneFavorites(upcoming.map(e => e.id))
      } catch (err) {
        console.error('[Evently] Nie udało się pobrać ulubionych:', err)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [favorites, loaded])

  // Podział na grupy czasowe
  const groups: Record<Bucket, Event[]> = { week: [], month: [], later: [], past: [] }
  events.forEach(e => groups[bucketFor(effectiveInfo(e))].push(e))
  const upcomingCount = groups.week.length + groups.month.length + groups.later.length
  const order: Bucket[] = ['week', 'month', 'later', 'past']

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-2">
        <Link href="/" className="text-[13px] text-zinc-500 mb-2 inline-block hover:text-zinc-300 transition-colors">
          ← Wróć
        </Link>
        <h1 className="text-[26px] md:text-[32px] font-black tracking-tight">
          Moje <span className="text-green-500">ulubione</span>
        </h1>
        <p className="text-[12px] text-zinc-500 mt-1">
          {loading ? 'Ładowanie...'
            : events.length === 0 ? 'Brak zapisanych wydarzeń'
            : `${upcomingCount} ${upcomingWord(upcomingCount)} ${eventWord(upcomingCount)}`}
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 h-64 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🤍</div>
            <p className="text-zinc-300 text-base font-semibold mb-2">Nie masz jeszcze ulubionych</p>
            <p className="text-zinc-600 text-sm mb-6 max-w-sm mx-auto">
              Kliknij serduszko przy wydarzeniu, żeby zapisać je tutaj i mieć pod ręką.
            </p>
            <Link
              href="/"
              className="inline-block bg-green-500 text-black text-[13px] font-bold px-6 py-2.5 rounded-xl hover:bg-green-400 transition-colors"
            >
              Przeglądaj wydarzenia
            </Link>
          </div>
        ) : (
          <>
            {order.filter(b => b !== 'past').map(bucket => {
              const list = groups[bucket]
              if (list.length === 0) return null

              return (
                <section key={bucket} className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <h2 className="text-[15px] font-black tracking-tight text-white">
                      {BUCKET_LABELS[bucket]}
                    </h2>
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/60 px-1.5 py-0.5 rounded-full">
                      {list.length}
                    </span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map(e => (
                      <EventTile key={e.id} event={e} onRemove={toggleFavorite} />
                    ))}
                  </div>
                </section>
              )
            })}

</>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useFavorites } from '@/hooks/useFavorites'

interface Event {
  id: string
  slug: string | null
  title: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  address: string | null
  city: string | null
  category: string | null
  image_url: string | null
  cover_image_url: string | null
  is_free: boolean
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

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function eventDay(dateStr: string): Date {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

function getDateParts(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  const today = startOfToday()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const ev = eventDay(dateStr)
  return {
    day: d.getDate(),
    month: MONTH_PL[d.getMonth()],
    isToday: ev.getTime() === today.getTime(),
    isTomorrow: ev.getTime() === tomorrow.getTime(),
  }
}

// Grupowanie po CZASIE (nie po miejscu) — ulubione to lista „co mnie czeka”,
// więc najważniejsze jest, co jest najbliżej i czego nie przegapić.
type Bucket = 'week' | 'month' | 'later' | 'past'

const BUCKET_LABELS: Record<Bucket, string> = {
  week:  'W tym tygodniu',
  month: 'W tym miesiącu',
  later: 'Później',
  past:  'Minione',
}

function bucketFor(e: Event): Bucket {
  const today = startOfToday()
  // event trwa do end_date (festiwal kilkudniowy) albo do start_date
  const endRef = eventDay(e.end_date || e.start_date)
  if (endRef < today) return 'past'

  const start = eventDay(e.start_date)
  const in7 = new Date(today); in7.setDate(today.getDate() + 7)
  const in30 = new Date(today); in30.setDate(today.getDate() + 30)

  if (start <= in7) return 'week'
  if (start <= in30) return 'month'
  return 'later'
}

function EventTile({ event, onRemove }: { event: Event; onRemove: (id: string) => void }) {
  const cat = normalizeCategory(event.category)
  const { day, month, isToday, isTomorrow } = getDateParts(event.start_date)
  const img = event.cover_image_url || event.image_url
  const time = event.start_time?.slice(0, 5)
  const place = event.venue_name || event.address || event.city

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-colors hover:border-green-500/40">
      <Link href={`/events/${event.slug || event.id}`} className="block">
        {/* Obrazek */}
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-800">
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

      {/* Usuń z ulubionych */}
      <button
        onClick={() => onRemove(event.id)}
        aria-label="Usuń z ulubionych"
        className="absolute right-3 top-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm shadow-lg hover:bg-red-600 transition-colors"
      >
        ♥
      </button>
    </div>
  )
}

export default function UlubionePage() {
  const { favorites, loaded, toggleFavorite } = useFavorites()
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
          .select('*')
          .in('id', favorites)
          .order('start_date', { ascending: true })
        if (error) throw error
        setEvents(data ?? [])
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
  events.forEach(e => groups[bucketFor(e)].push(e))
  const upcomingCount = groups.week.length + groups.month.length + groups.later.length
  const order: Bucket[] = ['week', 'month', 'later', 'past']

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <Link href="/" className="text-[13px] text-zinc-500 mb-3 inline-block hover:text-zinc-300 transition-colors">
          ← Wróć
        </Link>
        <h1 className="text-[26px] md:text-[32px] font-black tracking-tight">
          Moje <span className="text-green-500">ulubione</span>
        </h1>
        <p className="text-[12px] text-zinc-500 mt-1">
          {loading ? 'Ładowanie...'
            : events.length === 0 ? 'Brak zapisanych wydarzeń'
            : `${upcomingCount} ${upcomingCount === 1 ? 'nadchodzące' : 'nadchodzących'}${groups.past.length ? ` · ${groups.past.length} minione` : ''}`}
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
          order.map(bucket => {
            const list = groups[bucket]
            if (list.length === 0) return null
            const isPast = bucket === 'past'

            return (
              <section key={bucket} className={`mb-10 ${isPast ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className={`text-[15px] font-black tracking-tight ${isPast ? 'text-zinc-500' : 'text-white'}`}>
                    {BUCKET_LABELS[bucket]}
                  </h2>
                  <span className="text-[11px] font-bold text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
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
          })
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Event {
  id: string
  title: string
  start_date: string
  start_time: string | null
  end_time: string | null
  location_name: string | null
  city: string | null
  category: string | null
  image_url: string | null
  cover_image_url: string | null
  is_free: boolean
  rsvp_count: number
  latitude: number | null
  longitude: number | null
  status: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: 'Wszystkie', emoji: '🏠' },
  { id: 'kultura', label: 'Kultura', emoji: '🎭' },
  { id: 'muzyka', label: 'Muzyka', emoji: '🎵' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'jedzenie', label: 'Jedzenie', emoji: '🍽️' },
  { id: 'family', label: 'Rodzinne', emoji: '👨‍👩‍👧' },
]

const RADII = [5, 10, 25]

const CAT_COLORS: Record<string, string> = {
  kultura: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  culture: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  muzyka: 'bg-green-500/20 text-green-300 border-green-500/30',
  music: 'bg-green-500/20 text-green-300 border-green-500/30',
  festiwal: 'bg-green-500/20 text-green-300 border-green-500/30',
  sport: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  jedzenie: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  food: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  family: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  targi: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const CAT_LABELS: Record<string, string> = {
  kultura: 'Kultura', culture: 'Kultura', muzyka: 'Muzyka', music: 'Muzyka',
  festiwal: 'Festiwal', sport: 'Sport', jedzenie: 'Jedzenie', food: 'Jedzenie',
  family: 'Rodzinne', targi: 'Targi', technology: 'Technologia',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'DZIŚ'
  if (d.toDateString() === tomorrow.toDateString()) return 'JUTRO'
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  const day = d.getDay()
  return day === 0 || day === 6
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function isTomorrow(dateStr: string): boolean {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return new Date(dateStr).toDateString() === t.toDateString()
}

// ─── Event List Item ──────────────────────────────────────────────────────────
function EventItem({ event, distance }: { event: Event; distance: number | null }) {
  const [going, setGoing] = useState(false)
  const cat = (event.category ?? 'inne').toLowerCase()
  const catColor = CAT_COLORS[cat] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
  const catLabel = CAT_LABELS[cat] ?? cat
  const dl = dateLabel(event.start_date)
  const time = event.start_time?.slice(0, 5) ?? ''

  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className="flex items-center gap-3 py-3 border-b border-zinc-800/60 active:bg-zinc-800/30 transition-colors">
        {/* Category icon / color dot */}
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg">
          {cat.includes('muzyk') || cat.includes('music') || cat.includes('festiwal') ? '🎵'
            : cat.includes('sport') ? '⚽'
            : cat.includes('jedzen') || cat.includes('food') ? '🍽️'
            : cat.includes('family') ? '👨‍👩‍👧'
            : cat.includes('targi') ? '🏪'
            : '🎭'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${catColor}`}>
              {catLabel.toUpperCase()}
            </span>
            {event.is_free && (
              <span className="text-[9px] font-bold text-green-400">Wstęp wolny</span>
            )}
          </div>
          <p className="text-[13px] font-bold text-white leading-tight truncate">{event.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold ${
              dl === 'DZIŚ' ? 'text-green-400' : dl === 'JUTRO' ? 'text-yellow-400' : 'text-zinc-500'
            }`}>{dl}</span>
            {time && <span className="text-[10px] text-zinc-500">{time}</span>}
            {distance !== null && (
              <span className="text-[10px] text-zinc-500">📍 {formatDist(distance)}</span>
            )}
            {!distance && event.city && (
              <span className="text-[10px] text-zinc-500">📍 {event.city}</span>
            )}
          </div>
        </div>

        {/* Idę button */}
        <button
          onClick={(e) => { e.preventDefault(); setGoing(!going) }}
          className={`flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors ${
            going ? 'bg-green-600 text-white' : 'bg-green-500 text-black'
          }`}
        >
          {going ? '✓ Idę' : 'Idę'}
        </button>
      </div>
    </Link>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MobileHome() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [radius, setRadius] = useState<number>(25)
  const [activeDate, setActiveDate] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLon(pos.coords.longitude) },
        () => {} // silent fail
      )
    }
  }, [])

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true })
        .limit(100)
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [])

  // Filter + sort
  const filtered = events
    .map(e => ({
      ...e,
      distance: (userLat && userLon && e.latitude && e.longitude)
        ? haversine(userLat, userLon, e.latitude, e.longitude)
        : null
    }))
    .filter(e => {
      if (e.distance !== null && e.distance > radius) return false
      if (activeDate === 'today' && !isToday(e.start_date)) return false
      if (activeDate === 'tomorrow' && !isTomorrow(e.start_date)) return false
      if (activeDate === 'weekend' && !isWeekend(e.start_date)) return false
      if (activeCategory !== 'all') {
        const cat = (e.category ?? '').toLowerCase()
        if (!cat.includes(activeCategory.toLowerCase())) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const inTitle = e.title?.toLowerCase().includes(q)
        const inCity = e.city?.toLowerCase().includes(q)
        if (!inTitle && !inCity) return false
      }
      return true
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── HEADER ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[18px] font-black text-green-500 tracking-tight">● evently</span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm">🔔</button>
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
            </Link>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[13px] text-green-500 font-semibold">Suwałki ▾</span>
          <span className="text-[11px] text-zinc-600 ml-1">• {filtered.length} wydarzeń</span>
        </div>

        {/* Radius */}
        <div className="flex gap-2 mb-3">
          {RADII.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                radius === r
                  ? 'bg-green-500 text-black border-green-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        {/* Date filters */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'today', label: 'Dziś' },
            { id: 'tomorrow', label: 'Jutro' },
            { id: 'weekend', label: 'Weekend' },
          ].map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDate(d.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                activeDate === d.id
                  ? 'bg-green-500 text-black border-green-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-green-500 text-black border-green-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <span className="text-zinc-600">🔍</span>
          <input
            className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 outline-none"
            placeholder="Szukaj wydarzeń, miejsc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search.trim() && router.push(`/events?q=${encodeURIComponent(search.trim())}`)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-600 text-sm">✕</button>
          )}
        </div>
      </div>

      {/* ── EVENT LIST ── */}
      <div className="px-4 pb-28">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-zinc-800/60">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-zinc-400 text-sm font-semibold">Brak wydarzeń</p>
            <p className="text-zinc-600 text-xs mt-1">Spróbuj zwiększyć promień lub zmień filtry</p>
          </div>
        ) : (
          filtered.map(event => (
            <EventItem
              key={event.id}
              event={event}
              distance={event.distance}
            />
          ))
        )}
      </div>

      {/* ── AI SCANNER ── */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Link
          href="/skanuj"
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 flex items-center gap-3 block shadow-lg"
        >
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📷</div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white flex items-center gap-2">
              Znalazłeś plakat?
              <span className="bg-green-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded">AI</span>
            </div>
            <div className="text-[10px] text-zinc-500">Zeskanuj i dodaj wydarzenie</div>
          </div>
          <span className="text-zinc-600">›</span>
        </Link>
      </div>

    </div>
  )
}
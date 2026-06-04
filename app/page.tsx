'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Event {
  id: string
  title: string
  description: string | null
  start_date: string
  start_time: string | null
  end_time: string | null
  location_name: string | null
  category: string | null
  image_url: string | null
  is_free: boolean
  rsvp_count: number
  status: string
  lat: number | null
  lng: number | null
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',     label: 'Wszystkie', emoji: '🏠' },
  { id: 'muzyka',  label: 'Muzyka',    emoji: '🎵' },
  { id: 'kultura', label: 'Kultura',   emoji: '🎭' },
  { id: 'sport',   label: 'Sport',     emoji: '⚽' },
  { id: 'jedzenie',label: 'Jedzenie',  emoji: '🍽️' },
  { id: 'inne',    label: 'Więcej',    emoji: '···' },
]

const CATEGORY_COLORS: Record<string, string> = {
  festiwal:  'bg-green-500 text-black',
  muzyka:    'bg-green-500 text-black',
  sport:     'bg-blue-500 text-white',
  kultura:   'bg-purple-500 text-white',
  jedzenie:  'bg-orange-500 text-white',
  inne:      'bg-zinc-500 text-white',
}

const CATEGORY_TAG: Record<string, string> = {
  festiwal: 'FESTIWAL',
  muzyka:   'MUZYKA',
  sport:    'SPORT',
  kultura:  'KULTURA',
  jedzenie: 'JEDZENIE',
  inne:     'INNE',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'DZIŚ'
  if (d.toDateString() === tomorrow.toDateString()) return 'JUTRO'
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function gradientForCategory(cat: string | null): string {
  switch (cat) {
    case 'muzyka':
    case 'festiwal': return 'from-[#060e18] via-[#0e2040] to-[#1e3a6e]'
    case 'sport':    return 'from-[#060f1a] via-[#0a1f35] to-[#1a3a5c]'
    case 'kultura':  return 'from-[#120820] via-[#1e1040] to-[#3d1a6e]'
    case 'jedzenie': return 'from-[#1a0a00] via-[#2a1500] to-[#4a2800]'
    default:         return 'from-zinc-900 via-zinc-800 to-zinc-700'
  }
}

function emojiForCategory(cat: string | null): string {
  switch (cat) {
    case 'muzyka':
    case 'festiwal': return '🎤'
    case 'sport':    return '⚽'
    case 'kultura':  return '🎭'
    case 'jedzenie': return '🍽️'
    default:         return '📅'
  }
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event }: { event: Event }) {
  const [going, setGoing] = useState(false)
  const cat = event.category?.toLowerCase() ?? 'inne'
  const tagClass = CATEGORY_COLORS[cat] ?? 'bg-zinc-600 text-white'
  const tagLabel = CATEGORY_TAG[cat] ?? cat.toUpperCase()
  const dateLabel = formatDate(event.start_date)
  const gradient = gradientForCategory(cat)
  const emoji = emojiForCategory(cat)

  return (
    <Link href={`/events/${event.id}`} className="flex-shrink-0 w-[152px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 block">
      {/* Image / gradient */}
      <div className={`h-24 relative overflow-hidden bg-gradient-to-br ${gradient}`}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">{emoji}</div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Tag */}
        <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-[2px] rounded-md ${tagClass}`}>{tagLabel}</span>
        {/* Date badge */}
        <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-[2px] rounded-md bg-black/60 border border-white/10 text-white">{dateLabel}</span>
        {/* Time */}
        {event.start_time && (
          <span className="absolute bottom-1.5 left-2 text-[9px] font-semibold text-white bg-black/60 px-1.5 py-[2px] rounded">
            {event.start_time.slice(0, 5)}
          </span>
        )}
        {/* Free badge */}
        {event.is_free && (
          <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-1.5 py-[2px] rounded">
            Wstęp wolny
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-white leading-tight line-clamp-2 mb-1">{event.title}</p>
        <p className="text-[9px] text-zinc-500 mb-2 truncate">📍 {event.location_name ?? 'Suwałki'}</p>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-500">👥 {event.rsvp_count ?? 0} idzie</span>
          <button
            onClick={(e) => { e.preventDefault(); setGoing(!going) }}
            className={`text-[9px] font-black px-2.5 py-1 rounded-lg transition-colors ${
              going ? 'bg-green-600 text-white' : 'bg-green-500 text-black'
            }`}
          >
            {going ? '✓ Idę' : '👥 Idę'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchValue, setSearchValue] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true })
        .limit(20)

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory)
      }

      const { data } = await query
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [activeCategory])

  function handleSearch() {
    if (searchValue.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const todayEvents = events.filter(e => formatDate(e.start_date) === 'DZIŚ')
  const upcomingEvents = events.filter(e => formatDate(e.start_date) !== 'DZIŚ')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[18px] font-black text-green-500 tracking-tight">● evently</span>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm">
            🔔
          </button>
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
          </Link>
        </div>
      </div>

      {/* ── Location bar ── */}
      <div className="flex items-center gap-1.5 px-4 pb-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <button className="text-[11px] text-green-500 font-semibold">Suwałki ▾</button>
        <span className="text-[11px] text-zinc-600 ml-1">• {events.length} wydarzeń</span>
      </div>

      {/* ── Hero ── */}
      <div className="px-4 pb-3">
        <h1 className="text-[27px] font-black leading-[1.05] tracking-tight">
          Co robisz dziś<br />
          <span className="text-green-500">w Suwałkach?</span>
        </h1>
      </div>

      {/* ── Search ── */}
      <div className="mx-4 mb-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <span className="text-zinc-600 text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-[11px] text-zinc-300 placeholder-zinc-600 outline-none"
          placeholder="Szukaj wydarzeń, artystów, miejsc..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="bg-green-500 text-black text-[10px] font-black px-3 py-1.5 rounded-lg"
        >
          Szukaj
        </button>
      </div>

      {/* ── Categories ── */}
      <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg border transition-colors ${
              activeCategory === cat.id
                ? 'bg-green-500/20 border-green-500'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              {cat.emoji}
            </div>
            <span className={`text-[9px] font-medium ${activeCategory === cat.id ? 'text-green-500' : 'text-zinc-500'}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Popular / Today events ── */}
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-[14px] font-black text-white">
          {todayEvents.length > 0 ? 'Dzisiaj' : 'Popularne wydarzenia'}
        </span>
        <Link href="/events" className="text-[11px] text-green-500 font-semibold">
          Zobacz wszystkie ›
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {[1,2,3].map(i => (
            <div key={i} className="flex-shrink-0 w-[152px] h-[180px] rounded-2xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="px-4 text-zinc-500 text-sm">Brak wydarzeń w tej kategorii.</p>
      ) : (
        <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {(todayEvents.length > 0 ? todayEvents : events).slice(0, 8).map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* ── AI Scanner Banner ── */}
      <Link href="/skanuj" className="mx-4 mb-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-3 block">
        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          📷
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-bold text-white flex items-center gap-2">
            Skanuj plakat AI
            <span className="bg-green-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded">NOWOŚĆ</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            Zrób zdjęcie plakatu — AI wypełni formularz
          </div>
        </div>
        <span className="text-zinc-600 text-base">›</span>
      </Link>

      {/* ── Upcoming ── */}
      {upcomingEvents.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[14px] font-black text-white">Nadchodzące</span>
            <Link href="/events" className="text-[11px] text-green-500 font-semibold">
              Zobacz wszystkie ›
            </Link>
          </div>
          <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {upcomingEvents.slice(0, 8).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}

      {/* ── Map mini-banner ── */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-black text-white">Blisko Ciebie</span>
          <Link href="/mapa" className="text-[11px] text-green-500 font-semibold">Zobacz mapę ›</Link>
        </div>
        <Link href="/mapa" className="block h-20 rounded-xl overflow-hidden relative bg-[#192819] border border-zinc-800">
          {/* Grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(34,197,94,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,197,94,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '22px 22px',
            }}
          />
          {/* Fake pins */}
          <div className="absolute top-[30%] left-[40%] w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white shadow-[0_0_0_5px_rgba(34,197,94,0.2)]" />
          <div className="absolute top-[20%] left-[60%] w-6 h-6 rounded-full bg-orange-500 border-2 border-zinc-950 flex items-center justify-center text-[10px]">🍽️</div>
          <div className="absolute top-[50%] left-[25%] w-6 h-6 rounded-full bg-green-500 border-2 border-zinc-950 flex items-center justify-center text-[10px]">🎵</div>
          <div className="absolute top-[35%] left-[75%] w-6 h-6 rounded-full bg-purple-500 border-2 border-zinc-950 flex items-center justify-center text-[10px]">⭐</div>
        </Link>
      </div>

    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-green-500 text-sm animate-pulse">Ładowanie...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
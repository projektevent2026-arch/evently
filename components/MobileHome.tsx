'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

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
}

const CATEGORIES = [
  { id: 'all',      label: 'Wszystkie', emoji: '🏠' },
  { id: 'kultura',  label: 'Kultura',   emoji: '🎭' },
  { id: 'muzyka',   label: 'Muzyka',    emoji: '🎵' },
  { id: 'sport',    label: 'Sport',     emoji: '⚽' },
  { id: 'jedzenie', label: 'Jedzenie',  emoji: '🍽️' },
  { id: 'family',   label: 'Rodzinne',  emoji: '👨‍👩‍👧' },
]

const RADII = [5, 10, 25]

const CAT_COLORS: Record<string, string> = {
  kultura: 'bg-purple-500 text-white', culture: 'bg-purple-500 text-white',
  muzyka: 'bg-green-500 text-black', music: 'bg-green-500 text-black',
  festiwal: 'bg-green-500 text-black', sport: 'bg-blue-500 text-white',
  jedzenie: 'bg-orange-500 text-white', food: 'bg-orange-500 text-white',
  family: 'bg-yellow-400 text-black', targi: 'bg-amber-500 text-black',
}

const CAT_LABELS: Record<string, string> = {
  kultura: 'Kultura', culture: 'Kultura', muzyka: 'Muzyka', music: 'Muzyka',
  festiwal: 'Festiwal', sport: 'Sport', jedzenie: 'Jedzenie', food: 'Jedzenie',
  family: 'Rodzinne', targi: 'Targi',
}

const CAT_GRADIENT: Record<string, string> = {
  muzyka: 'from-[#060e18] via-[#0e2040] to-[#1e3a6e]',
  festiwal: 'from-[#060e18] via-[#0e2040] to-[#1e3a6e]',
  music: 'from-[#060e18] via-[#0e2040] to-[#1e3a6e]',
  sport: 'from-[#060f1a] via-[#0a1f35] to-[#1a3a5c]',
  kultura: 'from-[#120820] via-[#1e1040] to-[#3d1a6e]',
  culture: 'from-[#120820] via-[#1e1040] to-[#3d1a6e]',
  family: 'from-[#1a0a00] via-[#2d1800] to-[#4a2800]',
  jedzenie: 'from-[#1a0800] via-[#2a1200] to-[#4a2200]',
  food: 'from-[#1a0800] via-[#2a1200] to-[#4a2200]',
  targi: 'from-[#1a1000] via-[#2a2000] to-[#3a3000]',
}

const CAT_EMOJI: Record<string, string> = {
  muzyka: '🎵', festiwal: '🎤', music: '🎵',
  sport: '⚽', kultura: '🎭', culture: '🎭',
  family: '👨‍👩‍👧', jedzenie: '🍽️', food: '🍽️', targi: '🏪',
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
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

function isToday(d: string) { return new Date(d).toDateString() === new Date().toDateString() }
function isTomorrow(d: string) {
  const t = new Date(); t.setDate(t.getDate() + 1)
  return new Date(d).toDateString() === t.toDateString()
}
function isWeekend(d: string) { const day = new Date(d).getDay(); return day === 0 || day === 6 }
function isOnDate(d: string, target: string) {
  return new Date(d).toDateString() === new Date(target).toDateString()
}

// ─── Poster Modal ─────────────────────────────────────────────────────────────
function PosterModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="Plakat"
        className="max-h-[88vh] max-w-full object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-white text-lg"
      >
        ✕
      </button>
    </div>
  )
}

// ─── City Selector Modal ──────────────────────────────────────────────────────
function CityModal({
  city, onClose, onSelectGPS, onSelectCity
}: {
  city: string
  onClose: () => void
  onSelectGPS: () => void
  onSelectCity: (city: string) => void
}) {
  const [input, setInput] = useState('')
  const POPULAR = ['Suwałki', 'Białystok', 'Olsztyn', 'Łomża', 'Augustów', 'Elk']

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
        <h2 className="text-[15px] font-black text-white mb-4">Wybierz lokalizację</h2>

        {/* GPS */}
        <button
          onClick={() => { onSelectGPS(); onClose() }}
          className="w-full flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-4"
        >
          <span className="text-xl">📍</span>
          <div className="text-left">
            <div className="text-[13px] font-bold text-green-400">Użyj mojej lokalizacji</div>
            <div className="text-[10px] text-zinc-500">GPS — pokaże wydarzenia blisko Ciebie</div>
          </div>
        </button>

        {/* Search */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
          <span className="text-zinc-500">🔍</span>
          <input
            className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 outline-none"
            placeholder="Wpisz miasto..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                onSelectCity(input.trim())
                onClose()
              }
            }}
          />
        </div>

        {/* Popular cities */}
        <div className="flex flex-wrap gap-2">
          {POPULAR.map(c => (
            <button
              key={c}
              onClick={() => { onSelectCity(c); onClose() }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                c === city
                  ? 'bg-green-500 text-black border-green-500'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, distance }: { event: Event & { distance: number | null }; distance: number | null }) {
  const [going, setGoing] = useState(false)
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  const cat = (event.category ?? 'inne').toLowerCase()
  const gradient = CAT_GRADIENT[cat] ?? 'from-zinc-900 via-zinc-800 to-zinc-700'
  const tagColor = CAT_COLORS[cat] ?? 'bg-zinc-600 text-white'
  const tagLabel = CAT_LABELS[cat] ?? cat
  const emoji = CAT_EMOJI[cat] ?? '📅'
  const dl = dateLabel(event.start_date)
  const time = event.start_time?.slice(0, 5)
  const img = event.cover_image_url || event.image_url

  return (
    <>
      {posterSrc && <PosterModal src={posterSrc} onClose={() => setPosterSrc(null)} />}
      <Link href={`/events/${event.id}`} className="block mb-3">
        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
          {/* Image */}
          <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${gradient}`}>
            {img ? (
              <img src={img} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-75" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">{emoji}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Top */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${tagColor}`}>
                {tagLabel.toUpperCase()}
              </span>
              <div className="flex items-center gap-1.5">
                {distance !== null && (
                  <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-lg border border-white/10">
                    📍 {formatDist(distance)}
                  </span>
                )}
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                  dl === 'DZIŚ' ? 'bg-green-500 text-black'
                  : dl === 'JUTRO' ? 'bg-yellow-400 text-black'
                  : 'bg-black/60 text-white border border-white/10'
                }`}>
                  {dl}
                </span>
              </div>
            </div>

            {/* Bottom */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between">
              {time && (
                <span className="text-[11px] font-semibold text-white bg-black/60 px-2 py-1 rounded-lg">
                  {time}
                </span>
              )}
              {event.is_free && (
                <span className="text-[9px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-1 rounded-lg ml-auto">
                  Wstęp wolny
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-white leading-tight mb-0.5 truncate">{event.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">
                  👥 {event.rsvp_count ?? 0} zainteresowanych
                </span>
                {(event.city || event.location_name) && distance === null && (
                  <span className="text-[10px] text-zinc-600 truncate">
                    • {event.city || event.location_name}
                  </span>
                )}
              </div>
            </div>

            {/* Poster button */}
            {img && (
              <button
                onClick={e => { e.preventDefault(); setPosterSrc(img) }}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base"
                title="Podgląd plakatu"
              >
                🖼️
              </button>
            )}

            {/* Idę */}
            <button
              onClick={e => { e.preventDefault(); setGoing(!going) }}
              className={`flex-shrink-0 text-[12px] font-black px-4 py-2 rounded-xl transition-colors ${
                going ? 'bg-green-600 text-white' : 'bg-green-500 text-black'
              }`}
            >
              {going ? '✓ Idę' : 'Idę'}
            </button>
          </div>
        </div>
      </Link>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MobileHome() {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [city, setCity] = useState('Suwałki')
  const [showCityModal, setShowCityModal] = useState(false)
  const [radius, setRadius] = useState(25)
  const [activeDate, setActiveDate] = useState<'all' | 'today' | 'tomorrow' | 'weekend' | 'custom'>('all')
  const [customDate, setCustomDate] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const requestGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      p => { setUserLat(p.coords.latitude); setUserLon(p.coords.longitude) },
      () => {}
    )
  }

  useEffect(() => { requestGPS() }, [])

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { data } = await supabase
        .from('events').select('*').eq('status', 'published')
        .order('start_date', { ascending: true }).limit(100)
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [])

  const filtered = events
    .map(e => ({
      ...e,
      distance: (userLat !== null && userLon !== null && e.latitude !== null && e.longitude !== null)
        ? haversine(userLat, userLon, e.latitude, e.longitude)
        : null
    }))
    .filter(e => {
      if (e.distance !== null && e.distance > radius) return false
      if (activeDate === 'today' && !isToday(e.start_date)) return false
      if (activeDate === 'tomorrow' && !isTomorrow(e.start_date)) return false
      if (activeDate === 'weekend' && !isWeekend(e.start_date)) return false
      if (activeDate === 'custom' && customDate && !isOnDate(e.start_date, customDate)) return false
      if (activeCategory !== 'all') {
        const cat = (e.category ?? '').toLowerCase()
        if (!cat.includes(activeCategory.toLowerCase())) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.title?.toLowerCase().includes(q) && !e.city?.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {showCityModal && (
        <CityModal
          city={city}
          onClose={() => setShowCityModal(false)}
          onSelectGPS={() => { requestGPS(); setCity('Moja lokalizacja') }}
          onSelectCity={c => setCity(c)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[18px] font-black text-green-500 tracking-tight">● evently</span>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm">🔔</button>
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
            </Link>
          </div>
        </div>

        {/* Location */}
        <button
          onClick={() => setShowCityModal(true)}
          className="flex items-center gap-1.5 mb-2"
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[13px] text-green-500 font-semibold">{city} ▾</span>
          <span className="text-[11px] text-zinc-600 ml-1">• {filtered.length} wydarzeń</span>
        </button>

        <h1 className="text-[22px] font-black leading-tight tracking-tight mb-3">
          Co dzieje się <span className="text-green-500">w pobliżu?</span>
        </h1>

        {/* Search */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
          <span className="text-zinc-600">🔍</span>
          <input
            className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 outline-none"
            placeholder="Szukaj wydarzeń, miejsc, kategorii..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search.trim() && router.push(`/events?q=${encodeURIComponent(search.trim())}`)}
          />
          {search && <button onClick={() => setSearch('')} className="text-zinc-600 text-sm">✕</button>}
        </div>

        {/* 1. Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${
                activeCategory === cat.id ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 2. Date filters */}
        <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'today', label: 'Dziś' },
            { id: 'tomorrow', label: 'Jutro' },
            { id: 'weekend', label: 'Weekend' },
          ].map(d => (
            <button key={d.id} onClick={() => { setActiveDate(d.id as any); setCustomDate('') }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${
                activeDate === d.id ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              {d.label}
            </button>
          ))}
          {/* Calendar picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                activeDate === 'custom' ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {activeDate === 'custom' && customDate
                ? new Date(customDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
                : '📅'}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
              value={customDate}
              onChange={e => {
                setCustomDate(e.target.value)
                setActiveDate('custom')
              }}
            />
          </div>
        </div>

        {/* 3. Radius */}
        <div className="flex gap-2 mb-1">
          {RADII.map(r => (
            <button key={r} onClick={() => setRadius(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                radius === r ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden border border-zinc-800">
                <div className="h-40 bg-zinc-800 animate-pulse" />
                <div className="p-3 flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/3" />
                  </div>
                  <div className="w-16 h-8 bg-zinc-800 rounded-xl animate-pulse" />
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
          filtered.map(e => <EventCard key={e.id} event={e} distance={e.distance} />)
        )}
      </div>

      {/* AI Scanner */}
      <div className="fixed bottom-[72px] left-4 right-4 z-40">
        <Link href="/skanuj" className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-3 py-2.5 flex items-center gap-3 block shadow-xl">
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📷</div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white flex items-center gap-2">
              Znalazłeś plakat?
              <span className="bg-green-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded">AI</span>
            </div>
            <div className="text-[10px] text-zinc-500">Zeskanuj i dodaj wydarzenie dla całego miasta</div>
          </div>
          <span className="text-zinc-500 text-sm font-bold">›</span>
        </Link>
      </div>
    </div>
  )
}
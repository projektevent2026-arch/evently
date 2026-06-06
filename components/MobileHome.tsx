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
  venue_name: string | null
  address: string | null
  city: string | null
  category: string | null
  image_url: string | null
  cover_image_url: string | null
  is_free: boolean
  rsvp_count: number
  latitude: number | null
  longitude: number | null
}

// Współrzędne miast dla liczenia odległości bez GPS
const CITY_COORDS: Record<string, [number, number]> = {
  'Suwałki':    [54.1113, 22.9302],
  'Białystok':  [53.1325, 23.1688],
  'Olsztyn':    [53.7784, 20.4801],
  'Łomża':      [53.1781, 22.0588],
  'Augustów':   [53.8435, 22.9796],
  'Elk':        [53.8278, 22.3576],
}

const CATEGORIES = [
  { id: 'all',      label: 'Wszystkie', emoji: '🏠' },
  { id: 'kultura',  label: 'Kultura',   emoji: '🎭' },
  { id: 'muzyka',   label: 'Muzyka',    emoji: '🎵' },
  { id: 'sport',    label: 'Sport',     emoji: '⚽' },
  { id: 'jedzenie', label: 'Jedzenie',  emoji: '🍽️' },
  { id: 'family',   label: 'Rodzinne',  emoji: '👨‍👩‍👧' },
  { id: 'inne',     label: 'Inne',      emoji: '···' },
]

const RADII = [5, 10, 25, 50]

const CAT_COLORS: Record<string, string> = {
  kultura: 'bg-purple-500 text-white',   culture: 'bg-purple-500 text-white',
  muzyka:  'bg-green-500 text-black',    music:   'bg-green-500 text-black',
  festiwal:'bg-green-500 text-black',    sport:   'bg-blue-500 text-white',
  jedzenie:'bg-orange-500 text-white',   food:    'bg-orange-500 text-white',
  family:  'bg-yellow-400 text-black',   targi:   'bg-amber-500 text-black',
  inne:    'bg-zinc-600 text-white',
}

const CAT_LABELS: Record<string, string> = {
  kultura:'Kultura', culture:'Kultura', muzyka:'Muzyka', music:'Muzyka',
  festiwal:'Festiwal', sport:'Sport', jedzenie:'Jedzenie', food:'Jedzenie',
  family:'Rodzinne', targi:'Targi', inne:'Inne',
}

const MONTH_PL = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU']

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m od Ciebie` : `${km.toFixed(1)} km od Ciebie`
}

function getDateParts(dateStr: string): { day: number; month: string; isToday: boolean; isTomorrow: boolean } {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  return {
    day: d.getDate(),
    month: MONTH_PL[d.getMonth()],
    isToday: d.toDateString() === today.toDateString(),
    isTomorrow: d.toDateString() === tomorrow.toDateString(),
  }
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
    <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <img
        src={src} alt="Plakat"
        className="max-h-[88vh] max-w-full object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
      <button onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-white">
        ✕
      </button>
    </div>
  )
}

// ─── City Modal ───────────────────────────────────────────────────────────────
function CityModal({ city, onClose, onSelectGPS, onSelectCity, radius, onSetRadius }: {
  city: string; onClose: () => void
  onSelectGPS: () => void; onSelectCity: (c: string) => void
  radius: number; onSetRadius: (r: number) => void
}) {
  const [input, setInput] = useState('')
  const POPULAR = Object.keys(CITY_COORDS)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl p-5 pb-8"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-3">Lokalizacja</p>

        <button onClick={() => { onSelectGPS(); onClose() }}
          className="w-full flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-2">
          <span className="text-xl">📡</span>
          <div className="text-left">
            <div className="text-[13px] font-bold text-white">Moja lokalizacja</div>
            <div className="text-[10px] text-zinc-500">Wykryj moją pozycję</div>
          </div>
        </button>

        <button onClick={() => {}} className="w-full flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-4">
          <span className="text-xl">🔍</span>
          <input
            className="flex-1 bg-transparent text-[13px] text-zinc-300 placeholder-zinc-600 outline-none"
            placeholder="Szukaj miasta"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) { onSelectCity(input.trim()); onClose() }
            }}
            onClick={e => e.stopPropagation()}
          />
        </button>

        <div className="flex flex-wrap gap-2 mb-5">
          {POPULAR.map(c => (
            <button key={c} onClick={() => { onSelectCity(c); onClose() }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                c === city ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
              {c}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-3">Promień</p>
        <div className="flex gap-2">
          {RADII.map(r => (
            <button key={r} onClick={() => onSetRadius(r)}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold border transition-colors ${
                r === radius ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
              {r} km
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, distance }: { event: Event; distance: number | null }) {
  const [going, setGoing] = useState(false)
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  const cat = (event.category ?? 'inne').toLowerCase()
  const tagColor = CAT_COLORS[cat] ?? 'bg-zinc-600 text-white'
  const tagLabel = CAT_LABELS[cat] ?? cat
  const { day, month, isToday: today, isTomorrow: tomorrow } = getDateParts(event.start_date)
  const time = event.start_time?.slice(0, 5)
  const img = event.cover_image_url || event.image_url

  return (
    <>
      {posterSrc && <PosterModal src={posterSrc} onClose={() => setPosterSrc(null)} />}
      <Link href={`/events/${event.id}`} className="block mb-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="p-3">
            {/* Top row: category + date */}
            <div className="flex items-start justify-between mb-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${tagColor}`}>
                {tagLabel.toUpperCase()}
              </span>
              {/* Date block */}
              <div className={`flex flex-col items-center px-2.5 py-1 rounded-xl min-w-[42px] ${
                today ? 'bg-green-500' : tomorrow ? 'bg-yellow-400' : 'bg-zinc-800'
              }`}>
                <span className={`text-[16px] font-black leading-none ${
                  today || tomorrow ? 'text-black' : 'text-white'
                }`}>{today ? 'DZIŚ' : tomorrow ? 'JUTRO' : day}</span>
                {!today && !tomorrow && (
                  <span className="text-[9px] font-bold text-zinc-400 leading-none mt-0.5">{month}</span>
                )}
              </div>
            </div>

            {/* Main content row */}
            <div className="flex gap-3">
              {/* Left: text info */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-white leading-tight mb-1 line-clamp-2">
                  {event.title}
                </p>
                {(event.venue_name || event.location_name) && (
                  <p className="text-[11px] text-zinc-400 mb-0.5">
                    👥 {event.venue_name || event.location_name}
                    {event.rsvp_count > 0 && (
                      <span className="text-zinc-500"> · {event.rsvp_count} zainteresowanych</span>
                    )}
                  </p>
                )}
                {event.address && (
                  <p className="text-[10px] text-zinc-500 mb-0.5">
                    📍 {event.address}{event.city ? `, ${event.city}` : ''}
                  </p>
                )}
                {distance !== null && (
                  <p className="text-[11px] font-semibold text-green-400">
                    📍 {formatDist(distance)}
                  </p>
                )}
                {time && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">🕐 {time}{event.end_time ? ` – ${event.end_time.slice(0,5)}` : ''}</p>
                )}
                {event.is_free && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                    Wstęp wolny
                  </span>
                )}
              </div>

              {/* Right: thumbnail */}
              {img && (
                <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-zinc-700">
                  <img src={img} alt={event.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Bottom: buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={e => { e.preventDefault(); setGoing(!going) }}
                className={`flex-shrink-0 text-[12px] font-black px-5 py-2 rounded-xl transition-colors ${
                  going ? 'bg-green-600 text-white' : 'bg-green-500 text-black'
                }`}
              >
                {going ? '✓ Idę' : 'Idę'}
              </button>
              {img && (
                <button
                  onClick={e => { e.preventDefault(); setPosterSrc(img) }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-green-400 border border-green-500/30 bg-green-500/10 px-4 py-2 rounded-xl"
                >
                  👁 Plakat
                </button>
              )}
              <div className="ml-auto text-zinc-600">›</div>
            </div>
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
  const [gpsActive, setGpsActive] = useState(false)
  const [city, setCity] = useState('Suwałki')
  const [showCityModal, setShowCityModal] = useState(false)
  const [radius, setRadius] = useState(25)
  const [activeDate, setActiveDate] = useState<'all'|'today'|'tomorrow'|'weekend'|'custom'>('all')
  const [customDate, setCustomDate] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  // Ref lat/lon — GPS lub miasto
  const effLat = gpsActive ? userLat : (CITY_COORDS[city]?.[0] ?? null)
  const effLon = gpsActive ? userLon : (CITY_COORDS[city]?.[1] ?? null)

  const requestGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      p => {
        setUserLat(p.coords.latitude)
        setUserLon(p.coords.longitude)
        setGpsActive(true)
      },
      () => {}
    )
  }

  // Domyślnie użyj koordynat Suwałk (bez pytania o GPS)
  useEffect(() => {
    requestGPS() // próba GPS — jak nie da, zostają koordynaty miasta
  }, [])

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
      distance: (effLat !== null && effLon !== null && e.latitude !== null && e.longitude !== null)
        ? haversine(effLat, effLon, e.latitude, e.longitude)
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
          onSelectCity={c => { setCity(c); setGpsActive(false) }}
          radius={radius}
          onSetRadius={setRadius}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[18px] font-black text-green-500 tracking-tight">● evently</span>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm">🔔</button>
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
            </Link>
          </div>
        </div>

        {/* Location bar */}
        <button onClick={() => setShowCityModal(true)}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 mb-3 w-full">
          <span className="text-green-500 text-sm">📍</span>
          <span className="text-[13px] text-green-500 font-semibold">{city} ▾</span>
          <span className="text-[11px] text-zinc-600">• {radius} km</span>
          <span className="ml-auto text-[11px] text-zinc-500">{filtered.length} wydarzeń</span>
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

        {/* Categories */}
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

        {/* Date filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {([
            { id: 'all', label: 'Wszystkie' },
            { id: 'today', label: 'Dziś' },
            { id: 'tomorrow', label: 'Jutro' },
            { id: 'weekend', label: 'Weekend' },
          ] as const).map(d => (
            <button key={d.id} onClick={() => { setActiveDate(d.id); setCustomDate('') }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${
                activeDate === d.id ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              {d.label}
            </button>
          ))}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                activeDate === 'custom' ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              📅 {activeDate === 'custom' && customDate
                ? new Date(customDate).toLocaleDateString('pl-PL', { day:'2-digit', month:'2-digit' })
                : 'Kalendarz'}
            </button>
            <input ref={dateInputRef} type="date"
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
              value={customDate}
              onChange={e => { setCustomDate(e.target.value); setActiveDate('custom') }}
            />
          </div>
        </div>
      </div>

      {/* Event list */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex justify-between mb-2">
                  <div className="h-6 w-20 bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-10 w-12 bg-zinc-800 rounded-xl animate-pulse" />
                </div>
                <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2 mb-1" />
                <div className="h-3 bg-zinc-800 rounded animate-pulse w-2/3" />
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
        <Link href="/skanuj"
          className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-3 py-2.5 flex items-center gap-3 block shadow-xl">
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
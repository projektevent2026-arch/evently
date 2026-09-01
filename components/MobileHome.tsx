'use client'

import { matchesQuery } from '@/lib/searchEvent'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useFavorites } from '@/hooks/useFavorites'
import PosterModal from '@/components/PosterModal'
import { dateBadgeParts, isToday, isTomorrow, isThisWeekend, isSameLocalDate, haversineKm, formatDist } from '@/lib/eventFormat'

interface Event {
  id: string
  title: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  next_date: string
  next_start_time: string | null
  next_end_time: string | null
  schedule_type: string
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

const CITY_COORDS: Record<string, [number, number]> = {
  'Suwałki':   [54.1113, 22.9302],
  'Białystok': [53.1325, 23.1688],
  'Olsztyn':   [53.7784, 20.4801],
  'Łomża':     [53.1781, 22.0588],
  'Augustów':  [53.8435, 22.9796],
  'Elk':       [53.8278, 22.3576],
}

const CATEGORIES = [
  { id: 'all',     label: 'Wszystkie', emoji: '🏠' },
  { id: 'festyny', label: 'Festyny',   emoji: '🎪' },
  { id: 'kultura', label: 'Kultura',   emoji: '🎭' },
  { id: 'muzyka',  label: 'Muzyka',    emoji: '🎵' },
  { id: 'sport',   label: 'Sport',     emoji: '⚽' },
]

const RADII = [5, 10, 25, 50]

const CAT_COLORS: Record<string, string> = {
  festyny: 'bg-amber-500 text-black',
  kultura: 'bg-purple-500 text-white',
  muzyka:  'bg-green-500 text-black',
  sport:   'bg-blue-500 text-white',
}

const CAT_LABELS: Record<string, string> = {
  festyny: 'Festyny',
  kultura: 'Kultura',
  muzyka:  'Muzyka',
  sport:   'Sport',
}

function normalizeCategory(raw: string | null): string {
  const c = (raw ?? '').toLowerCase().trim()
  if (c === 'kultura' || c === 'culture') return 'kultura'
  if (c === 'muzyka' || c === 'music') return 'muzyka'
  if (c === 'sport') return 'sport'
  return 'festyny'
}

// ─────────────────────────────────────────────────────────────
// FETCH z timeoutem + retry. To jest fix na P1 (nieskończone „Ładowanie").
// Jak zapytanie zawiśnie -> po TIMEOUT_MS abort -> ponów. Po MAX_RETRIES
// nieudanych prób -> rzuć błąd, żeby UI pokazało guzik „Spróbuj ponownie".
//
// ZMIANA: zamiast pytać Supabase bezpośrednio, pytamy współdzielony,
// cache'owany endpoint /api/events (revalidate: 60) — ten sam co
// EventsGrid i EventMap. Limit 100 zostaje zachowany, tylko przeniesiony
// na klienta (endpoint zwraca wszystko, bo EventsGrid go potrzebuje bez limitu).
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

async function fetchEventsWithRetry(): Promise<Event[]> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/events', { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('Błąd pobierania: ' + res.status)
        const data: Event[] = await res.json()
        return data.slice(0, 100)
    } catch (err) {
      clearTimeout(timeoutId)
      lastErr = err
      // krótka pauza przed kolejną próbą (0.8s, 1.6s)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
      }
    }
  }

  throw lastErr ?? new Error('fetch events failed')
}

// Geokoder miast — ten sam wzorzec co LocationSidebar / EventMap (Nominatim + PL).
// countrycodes=pl -> „Ełk" trafia w polski Ełk, nie amerykański. Zwraca [lat, lon] albo null.
// To naprawia bug: miasto wpisane ręcznie (Olecko, Pisz, Gołdap) spoza CITY_COORDS
// nie dostawało współrzędnych -> brak dystansu i filtra promienia.
async function geocodeCity(query: string): Promise<[number, number] | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
      `&format=json&limit=1&countrycodes=pl&accept-language=pl`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'pl', 'User-Agent': 'Evently/1.0 (evently-silk-omega.vercel.app)' },
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]) {
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon]
    }
    return null
  } catch {
    return null
  }
}


function CityDropdown({ city, onClose, onSelectGPS, onSelectCity, radius, onSetRadius }: {
  city: string; onClose: () => void
  onSelectGPS: () => void; onSelectCity: (c: string) => void
  radius: number; onSetRadius: (r: number) => void
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [input, setInput] = useState('')
  const POPULAR = Object.keys(CITY_COORDS)

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute top-[108px] left-4 w-72 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[11px] text-zinc-400 font-semibold mb-3">Lokalizacja</p>

        <button onClick={() => { onSelectGPS(); onClose() }}
          className="w-full flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-3 mb-2 text-left">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 text-base">↗</span>
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">Moja lokalizacja</div>
            <div className="text-[11px] text-zinc-500">Wykryj moją pozycję</div>
          </div>
        </button>

        <button onClick={() => setShowSearch(!showSearch)}
          className="w-full flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-3 mb-4 text-left">
          <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-zinc-400 text-base">📍</span>
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">Wybierz miasto</div>
            <div className="text-[11px] text-zinc-500">Szukaj miasta</div>
          </div>
        </button>

        {showSearch && (
          <div className="mb-4">
            <div className="bg-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-2">
              <span className="text-zinc-500">🔍</span>
              <input
                className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 outline-none"
                placeholder="Wpisz miasto..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && input.trim()) { onSelectCity(input.trim()); onClose() }
                }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR.map(c => (
                <button key={c} onClick={() => { onSelectCity(c); onClose() }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    c === city ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-zinc-400 font-semibold mb-2">Promień</p>
        <div className="flex gap-2">
          {RADII.map(r => (
            <button key={r} onClick={() => onSetRadius(r)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
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

function EventCard({ event, distance }: { event: Event; distance: number | null }) {
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  // Ulubione na localStorage — bez kont.
  const { isFavorite, toggleFavorite } = useFavorites()
  const liked = isFavorite(event.id)
  const normCat = normalizeCategory(event.category)
  const tagColor = CAT_COLORS[normCat] ?? 'bg-zinc-600 text-white'
  const tagLabel = CAT_LABELS[normCat] ?? normCat
  const { day, month, isToday: today, isTomorrow: tomorrow } = dateBadgeParts(event.next_date)
  const time = event.next_start_time?.slice(0, 5)
  const img = event.cover_image_url || event.image_url
  const posterImg = event.image_url || event.cover_image_url

  return (
    <>
      {posterSrc && <PosterModal src={posterSrc} onClose={() => setPosterSrc(null)} />}
      <Link href={`/events/${event.id}`} className="block mb-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between mb-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${tagColor}`}>
                {tagLabel.toUpperCase()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.preventDefault(); toggleFavorite(event.id) }}
                  aria-label={liked ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                    liked ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {liked ? '♥' : '♡'}
                </button>
                {event.schedule_type === 'recurring' ? (
                  <div className="flex flex-col items-center px-2.5 py-1 rounded-xl min-w-[42px] bg-purple-500">
                    <span className="text-[9px] font-black leading-none text-white text-center">CYKL.</span>
                    <span className="text-[8px] font-bold text-white/80 leading-none mt-0.5">{day} {month}</span>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-white leading-tight mb-1 line-clamp-2">
                  {event.title}
                </p>
                {(event.venue_name || event.location_name) && (
                  <p className="text-[11px] text-zinc-400 mb-0.5">
                    👥 {event.venue_name || event.location_name}
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
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    🕐 {time}{event.end_time ? ` – ${event.end_time.slice(0,5)}` : ''}
                  </p>
                )}
                {event.is_free && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                    Wstęp wolny
                  </span>
                )}
              </div>

              {img && (
                <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-zinc-700">
                  <Image src={img} alt={event.title} fill sizes="80px" className="object-cover" />
                </div>
              )}
            </div>

            {/* Akcje karty — „Idę" ukryte (RSVP nie dziala bez kont, wraca w tier D) */}
            <div className="flex items-center gap-2 mt-3">
              {posterImg && (
                <button
                  onClick={e => { e.preventDefault(); setPosterSrc(posterImg) }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-green-400 border border-green-500/30 bg-green-500/10 px-4 py-2 rounded-xl">
                  👁 Plakat
                </button>
              )}
              <div className="ml-auto text-zinc-600 text-lg">›</div>
            </div>
          </div>
        </div>
      </Link>
    </>
  )
}

export function MobileHome() {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [city, setCity] = useState('Suwałki')
  // Współrzędne wybranego miasta. Dla miast z CITY_COORDS bierzemy je od razu,
  // dla wpisanych ręcznie dociągamy z Nominatim. Domyślnie Suwałki.
  const [cityCoords, setCityCoords] = useState<[number, number] | null>(CITY_COORDS['Suwałki'] ?? null)
  const [cityLoading, setCityLoading] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [radius, setRadius] = useState(25)
  const [activeDate, setActiveDate] = useState<'all'|'today'|'tomorrow'|'weekend'|'custom'>('all')
  const [customDate, setCustomDate] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const effLat = gpsActive ? userLat : (cityCoords?.[0] ?? null)
  const effLon = gpsActive ? userLon : (cityCoords?.[1] ?? null)

  // Wybór miasta (z listy popularnych albo wpisane ręcznie). Ustala współrzędne:
  // najpierw słownik CITY_COORDS, a jak nie ma -> geokoder Nominatim.
  const selectCity = async (name: string) => {
    setGpsActive(false)
    localStorage.removeItem('evently_lat')
    localStorage.removeItem('evently_lon')
    setCity(name)
    localStorage.setItem('evently_city', name)
    localStorage.setItem('evently_mode', 'city')

    let coords: [number, number] | null = CITY_COORDS[name] ?? null
    if (!coords) {
      setCityLoading(true)
      coords = await geocodeCity(name)
      setCityLoading(false)
    }
    setCityCoords(coords)
    if (coords) {
      localStorage.setItem('evently_city_lat', String(coords[0]))
      localStorage.setItem('evently_city_lon', String(coords[1]))
    } else {
      localStorage.removeItem('evently_city_lat')
      localStorage.removeItem('evently_city_lon')
    }
  }

  const applyPosition = async (lat: number, lon: number) => {
    setUserLat(lat)
    setUserLon(lon)
    setGpsActive(true)
    setGpsLoading(false)
    localStorage.setItem('evently_lat', String(lat))
    localStorage.setItem('evently_lon', String(lon))
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pl`,
        { headers: { 'User-Agent': 'Evently/1.0' } }
      )
      const data = await res.json()
      const name = data.address?.city || data.address?.town || data.address?.village || 'Moja lokalizacja'
      setCity(name)
      localStorage.setItem('evently_city', name)
      localStorage.setItem('evently_mode', 'gps')
    } catch {
      setCity('Moja lokalizacja')
    }
  }

  const requestGPS = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)

    const watchId = navigator.geolocation.watchPosition(
      p => {
        const isStale = p.timestamp < Date.now() - 5000
        if (isStale) return
        navigator.geolocation.clearWatch(watchId)
        applyPosition(p.coords.latitude, p.coords.longitude)
      },
      () => setGpsLoading(false),
      { maximumAge: 0, timeout: 15000, enableHighAccuracy: true }
    )

    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId)
      setGpsLoading(false)
    }, 8000)
  }

  // loadEvents wydzielone, żeby guzik „Spróbuj ponownie" mógł je wywołać.
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const list = await fetchEventsWithRetry()
      setEvents(list)
    } catch (err) {
      console.error('[Evently] Nie udało się pobrać wydarzeń:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Logo w headerze: reset filtrów do stanu domyślnego + świeże dane z serwera
  // (router.refresh() wymusza ominięcie cache'u routera dla strony z
  // export const revalidate = 60) + fetch listy wydarzeń jeszcze raz.
  const goHome = useCallback(() => {
    setSearch('')
    setActiveCategory('all')
    setActiveDate('all')
    setCustomDate('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    router.refresh()
    loadEvents()
  }, [router, loadEvents])

  useEffect(() => {
    const savedLat = localStorage.getItem('evently_lat')
    const savedLon = localStorage.getItem('evently_lon')
    const savedCity = localStorage.getItem('evently_city')
    const savedMode = localStorage.getItem('evently_mode')

    if (savedCity) setCity(savedCity)

    if (savedLat && savedLon && savedMode === 'gps') {
      setUserLat(parseFloat(savedLat))
      setUserLon(parseFloat(savedLon))
      setGpsActive(true)
      requestGPS()
    } else if (savedMode === 'city') {
      setGpsActive(false)
      // Odtwórz współrzędne miasta: zapisane z geokodera -> słownik -> null.
      const cLat = localStorage.getItem('evently_city_lat')
      const cLon = localStorage.getItem('evently_city_lon')
      if (cLat && cLon) {
        setCityCoords([parseFloat(cLat), parseFloat(cLon)])
      } else if (savedCity && CITY_COORDS[savedCity]) {
        setCityCoords(CITY_COORDS[savedCity])
      } else {
        setCityCoords(null)
      }
    } else {
      requestGPS()
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filtered = events
    .map(e => ({
      ...e,
      distance: (effLat !== null && effLon !== null && e.latitude !== null && e.longitude !== null)
        ? haversineKm(effLat, effLon, e.latitude, e.longitude) : null
    }))
    .filter(e => {
// Przy aktywnym wyszukiwaniu promień nie odcina — szukasz konkretnej rzeczy,
      // masz ją znaleźć niezależnie od odległości. Dystans dalej liczy się na karcie.
      if (!search.trim() && e.distance !== null && e.distance > radius) return false
      if (activeDate === 'today' && !isToday(e.next_date)) return false
      if (activeDate === 'tomorrow' && !isTomorrow(e.next_date)) return false
      if (activeDate === 'weekend' && !isThisWeekend(e.next_date)) return false
      if (activeDate === 'custom' && customDate && !isSameLocalDate(e.next_date, customDate)) return false
      if (activeCategory !== 'all') {
        if (normalizeCategory(e.category) !== activeCategory) return false
      }
      if (search.trim()) {
        if (!matchesQuery(e, search)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      return new Date(a.next_date).getTime() - new Date(b.next_date).getTime()
    })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {showCityDropdown && (
        <CityDropdown
          city={city}
          onClose={() => setShowCityDropdown(false)}
          onSelectGPS={() => { requestGPS(); setCity('Moja lokalizacja') }}
          onSelectCity={c => { selectCity(c) }}
          radius={radius}
          onSetRadius={setRadius}
        />
      )}

      {/* Header — samo logo, klikalne: reset filtrów + odświeżenie listy (goHome).
          Dzwonek (push) i avatar-atrapa (/profil 404) ukryte do tier D */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goHome}
            className="text-[18px] font-black text-green-500 tracking-tight"
          >
            ● evently
          </button>
        </div>

        <button
          onClick={() => setShowCityDropdown(true)}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 mb-3"
        >
          <span className="text-green-500 text-sm">📍</span>
          <span className="text-[13px] text-green-500 font-semibold">
            {gpsLoading || cityLoading ? '📡 Szukam...' : city} ▾
          </span>
          <span className="text-[11px] text-zinc-600">• {radius} km</span>
          <span className="text-[11px] text-zinc-500 ml-1">{filtered.length} wydarzeń</span>
        </button>

        <h1 className="text-[22px] font-black leading-tight tracking-tight mb-3">
          Co dzieje się <span className="text-green-500">w pobliżu?</span>
        </h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
          <span className="text-zinc-600">🔍</span>
          <input
            className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 outline-none"
            placeholder="Szukaj wydarzeń, miejsc, kategorii..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-zinc-600 text-sm">✕</button>}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2">
          {CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={e => {
                setActiveCategory(cat.id)
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${
                activeCategory === cat.id ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {([
            { id: 'all', label: 'Wszystkie' },
            { id: 'today', label: 'Dziś' },
            { id: 'tomorrow', label: 'Jutro' },
            { id: 'weekend', label: 'Weekend' },
          ] as const).map(d => (
            <button key={d.id}
              onClick={e => {
                setActiveDate(d.id)
                setCustomDate('')
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
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
              }`}>
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
        ) : loadError ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-zinc-300 text-sm font-semibold">Nie udało się załadować wydarzeń</p>
            <p className="text-zinc-600 text-xs mt-1 mb-4">Sprawdź połączenie i spróbuj ponownie</p>
            <button
              onClick={loadEvents}
              className="bg-green-500 text-black text-[13px] font-bold px-6 py-2.5 rounded-xl">
              Spróbuj ponownie
            </button>
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

      {/* Banner skanera — prowadzi do /dodaj-wydarzenie (skaner AI jest w formularzu).
          Wczesniej linkowal do /skanuj -> 404 */}
      <div className="fixed bottom-[72px] left-4 right-4 z-40">
        <Link href="/dodaj-wydarzenie"
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
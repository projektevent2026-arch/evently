'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

interface Event {
  id: string
  title: string
  slug: string
  category: string | null
  start_date: string
  venue_name: string | null
  latitude: number
  longitude: number
}

const CATEGORY_COLORS: Record<string, string> = {
  Kultura: '#8B5CF6',
  Muzyka: '#EF4444',
  Sport: '#3B82F6',
  Jedzenie: '#F97316',
  Rodzinne: '#EC4899',
  Technologia: '#06B6D4',
  Inne: '#6B7280',
}
const DEFAULT_COLOR = '#22C55E'

function getCategoryColor(cat: string | null) {
  return cat ? (CATEGORY_COLORS[cat] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isToday(d: string) {
  const a = new Date(d), b = new Date()
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isTomorrow(d: string) {
  const a = new Date(d), b = new Date()
  b.setDate(b.getDate() + 1)
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isThisWeekend(d: string) {
  const day = new Date(d).getDay()
  return day === 0 || day === 6
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type TimeFilter = 'wszystkie' | 'dzis' | 'jutro' | 'weekend'

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'wszystkie', label: 'Wszystkie' },
  { key: 'dzis', label: 'Dziś' },
  { key: 'jutro', label: 'Jutro' },
  { key: 'weekend', label: 'Weekend' },
]

export default function EventMap() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // ─── Czytamy filtry z URL ─────────────────────────────────────────────────
  const urlLat    = parseFloat(searchParams.get('lat')    ?? '')
  const urlLng    = parseFloat(searchParams.get('lng')    ?? '')
  const urlRadius = parseFloat(searchParams.get('radius') ?? '')
  const urlTime   = (searchParams.get('time') ?? 'wszystkie') as TimeFilter
  const urlQ      = (searchParams.get('q') ?? '').toLowerCase().trim()

  const urlCenter = useMemo<[number, number] | null>(() => {
    return (!isNaN(urlLat) && !isNaN(urlLng)) ? [urlLat, urlLng] : null
  }, [urlLat, urlLng])

  const activeCategories = useMemo<Set<string>>(() => {
    const raw = searchParams.get('category')
    if (!raw) return new Set()
    return new Set(raw.split(',').map(c => c.trim()).filter(Boolean))
  }, [searchParams])

  // ─── Lokalny stan inputa wyszukiwania (inicjalizacja z URL) ───────────────
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Leaflet refs ─────────────────────────────────────────────────────────
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerGroupRef = useRef<any>(null)
  const userMarkerRef  = useRef<any>(null)

  // ─── State ────────────────────────────────────────────────────────────────
  const [events,       setEvents]       = useState<Event[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)

  // ─── Fetch eventów + GPS ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase
      .from('events')
      .select('id, title, slug, category, start_date, venue_name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('start_date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data as Event[])
        setLoading(false)
      })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {},
      )
    }
  }, [])

  // ─── Inicjalizacja mapy (raz) ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet.markercluster')

      const center = urlCenter ?? userPosition ?? ([54.1, 22.93] as [number, number])

      const map = L.map(mapRef.current!, {
        center,
        zoom: urlCenter ? 13 : 11,
        zoomControl: false,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            ' &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        },
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapInstanceRef.current = map

      const mcg = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div style="
              width:40px;height:40px;border-radius:50%;
              background:#22C55E;color:black;
              display:flex;align-items:center;justify-content:center;
              font-weight:800;font-size:14px;
              border:3px solid rgba(255,255,255,0.8);
              box-shadow:0 2px 12px rgba(34,197,94,0.5);
            ">${count}</div>`,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })
        },
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      })

      markerGroupRef.current = mcg
      map.addLayer(mcg)
    }

    initMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filtrowanie (identyczne jak EventsGrid) ──────────────────────────────
  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (urlTime === 'dzis'    && !isToday(ev.start_date))       return false
      if (urlTime === 'jutro'   && !isTomorrow(ev.start_date))    return false
      if (urlTime === 'weekend' && !isThisWeekend(ev.start_date)) return false
      if (activeCategories.size > 0 && !activeCategories.has(ev.category ?? 'Inne')) return false
      if (urlQ) {
        const hay = `${ev.title} ${ev.venue_name ?? ''}`.toLowerCase()
        if (!hay.includes(urlQ)) return false
      }
      if (!isNaN(urlRadius) && urlRadius > 0 && !isNaN(urlLat) && !isNaN(urlLng)) {
        if (haversineKm(urlLat, urlLng, ev.latitude, ev.longitude) > urlRadius) return false
      }
      return true
    })
  }, [events, urlTime, activeCategories, urlQ, urlRadius, urlLat, urlLng])

  // ─── Update markerów ──────────────────────────────────────────────────────
  useEffect(() => {
    const mcg = markerGroupRef.current
    if (!mcg) return

    import('leaflet').then(({ default: L }) => {
      mcg.clearLayers()
      filtered.forEach(ev => {
        const color = getCategoryColor(ev.category)
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:22px;height:22px;border-radius:50% 50% 50% 0;
            background:${color};border:2px solid white;
            transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 22],
          popupAnchor: [0, -25],
        })
        const marker = L.marker([ev.latitude, ev.longitude], { icon })
        marker.bindPopup(`
          <div style="min-width:180px;font-family:system-ui,sans-serif">
            ${ev.category
              ? `<span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:8px">${ev.category}</span>`
              : ''}
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#111">${ev.title}</div>
            <div style="font-size:11px;color:#888;margin-bottom:4px">${formatDate(ev.start_date)}</div>
            ${ev.venue_name
              ? `<div style="font-size:11px;color:#aaa;margin-bottom:8px">${ev.venue_name}</div>`
              : ''}
            <a href="/events/${ev.slug}"
               style="display:block;text-align:center;background:#22C55E;color:black;font-weight:700;font-size:11px;padding:6px;border-radius:8px;text-decoration:none">
              Zobacz wydarzenie
            </a>
          </div>
        `)
        mcg.addLayer(marker)
      })
    })
  }, [filtered])

  // ─── Marker użytkownika / urlCenter ──────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      if (userMarkerRef.current) userMarkerRef.current.remove()
      const pos = urlCenter ?? userPosition
      if (!pos) return
      const icon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      userMarkerRef.current = L.marker(pos, { icon }).addTo(map)
    })
  }, [userPosition, urlCenter])

  // ─── Kategorie dostępne w danych ─────────────────────────────────────────
  const categories = useMemo(() => {
    return Array.from(new Set(events.map(e => e.category ?? 'Inne'))).sort()
  }, [events])

  // ─── Handler wyszukiwania (debounce 400ms → router.replace) ──────────────
  function handleSearch(value: string) {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set('q', value.trim())
      else params.delete('q')
      router.replace(`/mapa?${params.toString()}`, { scroll: false })
    }, 400)
  }

  function clearSearch() {
    setSearchInput('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.replace(`/mapa?${params.toString()}`, { scroll: false })
  }

  // ─── Handlery filtrów → router.replace ───────────────────────────────────
  function handleTimeFilter(value: TimeFilter) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'wszystkie') params.delete('time')
    else params.set('time', value)
    router.replace(`/mapa?${params.toString()}`, { scroll: false })
  }

  function handleToggleCategory(cat: string) {
    const params = new URLSearchParams(searchParams.toString())
    const raw = params.get('category')
    const current = new Set(raw ? raw.split(',').map(c => c.trim()).filter(Boolean) : [])
    if (current.has(cat)) current.delete(cat)
    else current.add(cat)
    if (current.size === 0) params.delete('category')
    else params.set('category', Array.from(current).join(','))
    router.replace(`/mapa?${params.toString()}`, { scroll: false })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-screen overflow-hidden">

      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-gray-200 px-3 py-2 space-y-2">

        {/* Wiersz 1: input wyszukiwania */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Szukaj wydarzeń na mapie..."
              className="w-full pl-8 pr-8 py-1.5 rounded-full text-sm border border-gray-200 bg-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-colors"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} wydarzeń
          </span>
        </div>

        {/* Wiersz 2: filtry czasu */}
        <div className="flex gap-2 flex-wrap">
          {TIME_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTimeFilter(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                urlTime === key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          {!isNaN(urlRadius) && urlRadius > 0 && (
            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-medium self-center">
              📍 {urlRadius} km
            </span>
          )}
        </div>

        {/* Wiersz 3: kategorie */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => {
            const color  = getCategoryColor(cat)
            const active = activeCategories.has(cat)
            return (
              <button
                key={cat}
                onClick={() => handleToggleCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : {}}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      )}

      <div ref={mapRef} className="flex-1 w-full" style={{ height: '100vh' }} />
    </div>
  )
}
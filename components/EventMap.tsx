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

interface PhotonResult {
  lat: number
  lng: number
  label: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Kultura: '#8B5CF6', Muzyka: '#EF4444', Sport: '#3B82F6',
  Jedzenie: '#F97316', Rodzinne: '#EC4899', Technologia: '#06B6D4', Inne: '#6B7280',
}
const DEFAULT_COLOR = '#22C55E'

function getCategoryColor(cat: string | null) {
  return cat ? (CATEGORY_COLORS[cat] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isToday(d: string) {
  const a = new Date(d), b = new Date()
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isTomorrow(d: string) {
  const a = new Date(d), b = new Date()
  b.setDate(b.getDate() + 1)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isThisWeekend(d: string) {
  const day = new Date(d).getDay()
  return day === 0 || day === 6
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
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

  // ─── URL jako single source of truth ─────────────────────────────────────
  const urlLat    = parseFloat(searchParams.get('lat')    ?? '')
  const urlLng    = parseFloat(searchParams.get('lng')    ?? '')
  const urlRadius = parseFloat(searchParams.get('radius') ?? '')
  const urlTime   = (searchParams.get('time') ?? 'wszystkie') as TimeFilter
  const urlQ      = (searchParams.get('q') ?? '').toLowerCase().trim()
  const hasLocation = !isNaN(urlLat) && !isNaN(urlLng)

  const urlCenter = useMemo<[number, number] | null>(() => {
    return hasLocation ? [urlLat, urlLng] : null
  }, [urlLat, urlLng, hasLocation])

  const activeCategories = useMemo<Set<string>>(() => {
    const raw = searchParams.get('category')
    if (!raw) return new Set()
    return new Set(raw.split(',').map(c => c.trim()).filter(Boolean))
  }, [searchParams])

  // ─── Leaflet refs ─────────────────────────────────────────────────────────
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerGroupRef = useRef<any>(null)
  const userMarkerRef  = useRef<any>(null)

  // ─── Timers ───────────────────────────────────────────────────────────────
  const searchTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const radiusTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── State ────────────────────────────────────────────────────────────────
  const [events,          setEvents]          = useState<Event[]>([])
  const [loading,         setLoading]         = useState(true)
  const [userPosition,    setUserPosition]    = useState<[number, number] | null>(null)

  // locationInput: jeśli jest GPS w URL, pokaż "Moja lokalizacja"
  const [locationInput,   setLocationInput]   = useState(
    () => (parseFloat(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('lat') ?? '') ? 'Moja lokalizacja' : '')
  )
  const [locationResults, setLocationResults] = useState<PhotonResult[]>([])
  const [showLocDropdown, setShowLocDropdown] = useState(false)
  const [searchInput,     setSearchInput]     = useState(() => searchParams.get('q') ?? '')
  const [radiusValue,     setRadiusValue]     = useState(() => {
    const r = parseFloat(searchParams.get('radius') ?? '25')
    return isNaN(r) ? 25 : r
  })
  const [gpsLoading, setGpsLoading] = useState(false)

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
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
            html: `<div style="width:40px;height:40px;border-radius:50%;background:#22C55E;color:black;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 12px rgba(34,197,94,0.5);">${count}</div>`,
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

  // ─── Filtrowanie ──────────────────────────────────────────────────────────
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
      if (!isNaN(urlRadius) && urlRadius > 0 && hasLocation) {
        if (haversineKm(urlLat, urlLng, ev.latitude, ev.longitude) > urlRadius) return false
      }
      return true
    })
  }, [events, urlTime, activeCategories, urlQ, urlRadius, urlLat, urlLng, hasLocation])

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
          html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 22],
          popupAnchor: [0, -25],
        })
        const marker = L.marker([ev.latitude, ev.longitude], { icon })
        marker.bindPopup(`
          <div style="min-width:180px;font-family:system-ui,sans-serif">
            ${ev.category ? `<span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:8px">${ev.category}</span>` : ''}
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#111">${ev.title}</div>
            <div style="font-size:11px;color:#888;margin-bottom:4px">${formatDate(ev.start_date)}</div>
            ${ev.venue_name ? `<div style="font-size:11px;color:#aaa;margin-bottom:8px">${ev.venue_name}</div>` : ''}
            <a href="/events/${ev.slug}" style="display:block;text-align:center;background:#22C55E;color:black;font-weight:700;font-size:11px;padding:6px;border-radius:8px;text-decoration:none">Zobacz wydarzenie</a>
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

  // ─── Kategorie ────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    return Array.from(new Set(events.map(e => e.category ?? 'Inne'))).sort()
  }, [events])

  // ─── Helper: aktualizacja URL ─────────────────────────────────────────────
  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    router.replace(`/mapa?${params.toString()}`, { scroll: false })
  }

  function flyTo(lat: number, lng: number, zoom = 13) {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 })
  }

  // ─── Handler: Lokalizacja (Photon) ────────────────────────────────────────
  function handleLocationInput(value: string) {
    setLocationInput(value)
    setShowLocDropdown(true)
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    if (!value.trim()) { setLocationResults([]); return }
    locationTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5&lang=pl&bbox=14.1,49.0,24.1,54.9`
        )
        const data = await res.json()
        const results: PhotonResult[] = (data.features ?? []).map((f: any) => ({
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          label: [f.properties.name, f.properties.city, f.properties.state]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', '),
        }))
        setLocationResults(results)
        setShowLocDropdown(true)
      } catch {}
    }, 400)
  }

  function handleLocationSelect(result: PhotonResult) {
    setLocationInput(result.label)
    setLocationResults([])
    setShowLocDropdown(false)
    updateParams({
      lat: result.lat.toFixed(6),
      lng: result.lng.toFixed(6),
    })
    flyTo(result.lat, result.lng)
  }

  // FIX: onBlur z dłuższym timeoutem (300ms) żeby dropdown zdążył obsłużyć klik
  function handleLocationBlur() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => setShowLocDropdown(false), 300)
  }

  // Wyczyszczenie lokalizacji — usuwa lat, lng, radius z URL + resetuje input
  function clearLocation() {
    setLocationInput('')
    setLocationResults([])
    setShowLocDropdown(false)
    updateParams({ lat: null, lng: null, radius: null })
  }

  // ─── Handler: GPS ─────────────────────────────────────────────────────────
  function handleGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserPosition([lat, lng])
        setLocationInput('Moja lokalizacja')
        setShowLocDropdown(false)
        updateParams({
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        })
        flyTo(lat, lng)
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { timeout: 10000 },
    )
  }

  // ─── Handler: Promień ─────────────────────────────────────────────────────
  function handleRadiusChange(value: number) {
    setRadiusValue(value)
    if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current)
    radiusTimerRef.current = setTimeout(() => updateParams({ radius: String(value) }), 300)
  }

  // ─── Handler: Wyszukiwanie tekstu ─────────────────────────────────────────
  function handleSearch(value: string) {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      updateParams({ q: value.trim() || null })
    }, 400)
  }

  function clearSearch() {
    setSearchInput('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    updateParams({ q: null })
  }

  // ─── Handler: Czas ────────────────────────────────────────────────────────
  function handleTimeFilter(value: TimeFilter) {
    updateParams({ time: value === 'wszystkie' ? null : value })
  }

  // ─── Handler: Kategoria ───────────────────────────────────────────────────
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

        {/* Wiersz 1: Lokalizacja + GPS */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {/* Pin icon */}
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <input
              type="text"
              value={locationInput}
              onChange={e => handleLocationInput(e.target.value)}
              onFocus={() => locationResults.length > 0 && setShowLocDropdown(true)}
              onBlur={handleLocationBlur}
              placeholder="Wpisz miasto lub miejscowość..."
              className="w-full pl-8 pr-8 py-1.5 rounded-full text-sm border border-gray-200 bg-white
                focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400
                transition-colors text-black placeholder:text-gray-400"
            />
            {/* Przycisk wyczyść lokalizację — widoczny gdy jest aktywna */}
            {(locationInput || hasLocation) && (
              <button
                onMouseDown={e => { e.preventDefault(); clearLocation() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none font-medium"
                title="Wyczyść lokalizację"
              >
                ×
              </button>
            )}
            {/* Dropdown Photon */}
            {showLocDropdown && locationResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {locationResults.map((r, i) => (
                  <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); handleLocationSelect(r) }}
                    className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Przycisk GPS */}
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            title="Użyj mojej lokalizacji"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full
              border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {gpsLoading
              ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
            }
          </button>
        </div>

        {/* Wiersz 2: Slider promienia (tylko gdy aktywna lokalizacja) */}
        {hasLocation && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-gray-500 flex-shrink-0">Promień:</span>
            <input
              type="range"
              min="5" max="100" step="5"
              value={radiusValue}
              onChange={e => handleRadiusChange(Number(e.target.value))}
              className="flex-1 h-1.5 accent-green-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-black w-12 text-right flex-shrink-0">
              {radiusValue} km
            </span>
          </div>
        )}

        {/* Wiersz 3: Wyszukiwanie po nazwie */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Szukaj po nazwie wydarzenia..."
              className="w-full pl-8 pr-8 py-1.5 rounded-full text-sm border border-gray-200 bg-white
                focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400
                transition-colors text-black placeholder:text-gray-400"
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
          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
            {filtered.length} wydarzeń
          </span>
        </div>

        {/* Wiersz 4: Filtry czasu */}
        <div className="flex gap-2 flex-wrap">
          {TIME_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTimeFilter(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                urlTime === key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Wiersz 5: Kategorie */}
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
                    : 'bg-white text-black border-gray-200 hover:border-gray-300'
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

      {/* Spinner */}
      {loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Mapa */}
      <div ref={mapRef} className="flex-1 w-full" style={{ height: '100vh' }} />
    </div>
  )
}
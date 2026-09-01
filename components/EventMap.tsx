'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { fmtDate, isToday, isTomorrow, isThisWeekend, isSameLocalDate, haversineKm, formatDist } from '@/lib/eventFormat'

interface Event {
  id: string
  title: string
  slug: string
  category: string | null
  start_date: string
  end_date: string | null
  next_date: string
  next_start_time: string | null
  next_end_time: string | null
  schedule_type: string
  venue_name: string | null
  city: string | null
  cover_image_url: string | null
  image_url: string | null
  is_free: boolean | null
  latitude: number
  longitude: number
}

interface GeoResult {
  lat: number
  lng: number
  label: string
}

const CATEGORY_COLORS: Record<string, string> = {
  kultura: '#8B5CF6', culture: '#8B5CF6', Kultura: '#8B5CF6',
  muzyka: '#22C55E',  music: '#22C55E',   Muzyka: '#22C55E',
  sport: '#3B82F6',   Sport: '#3B82F6',
  festyny: '#F59E0B', folk: '#F59E0B',    family: '#F59E0B', Rodzinne: '#F59E0B',
}
const CATEGORY_LABELS: Record<string, string> = {
  kultura: 'Kultura', culture: 'Kultura',
  muzyka: 'Muzyka',   music: 'Muzyka',
  sport: 'Sport',
  festyny: 'Festyny', folk: 'Festyny', family: 'Festyny', rodzinne: 'Festyny',
}

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Inne'
  return CATEGORY_LABELS[cat.toLowerCase()] ?? cat
}
const DEFAULT_COLOR = '#22C55E'

function getCategoryColor(cat: string | null) {
  return cat ? (CATEGORY_COLORS[cat] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

/** Popup składany ze stringa — tytuły z cudzysłowami muszą być bezpieczne. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function searchNominatim(query: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=pl&accept-language=pl`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'pl', 'User-Agent': 'Evently/1.0 (evently-silk-omega.vercel.app)' },
  })
  const data = await res.json()
  return (data as any[]).map(item => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name.split(',').slice(0, 2).join(',').trim(),
  }))
}

type TimeFilter = 'wszystkie' | 'dzis' | 'jutro' | 'weekend' | 'custom'

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'wszystkie', label: 'Wszystkie' },
  { key: 'dzis', label: 'Dziś' },
  { key: 'jutro', label: 'Jutro' },
  { key: 'weekend', label: 'Weekend' },
]

export default function EventMap() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)

  const urlLat    = parseFloat(searchParams.get('lat')    ?? '')
  const urlLng    = parseFloat(searchParams.get('lng')    ?? '')
  const urlRadius = parseFloat(searchParams.get('radius') ?? '')
  const urlTime   = (searchParams.get('time') ?? 'wszystkie') as TimeFilter
  const urlQ      = (searchParams.get('q') ?? '').toLowerCase().trim()
  const hasLocation = (!isNaN(urlLat) && !isNaN(urlLng)) || userPosition !== null
  const urlCenter = useMemo<[number, number] | null>(() => {
    return hasLocation ? [urlLat, urlLng] : null
  }, [urlLat, urlLng, hasLocation])

  const activeCategories = useMemo<Set<string>>(() => {
    const raw = searchParams.get('category')
    if (!raw) return new Set()
    return new Set(raw.split(',').map(c => c.trim()).filter(Boolean))
  }, [searchParams])

  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerGroupRef = useRef<any>(null)
  const userMarkerRef  = useRef<any>(null)
  const locationBoxRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const radiusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterBarRef   = useRef<HTMLDivElement>(null)

  const [events,       setEvents]       = useState<Event[]>([])
  const [loading,      setLoading]      = useState(true)
  const [locInput,     setLocInput]     = useState('')
  const [locResults,   setLocResults]   = useState<GeoResult[]>([])
  const [locLoading,   setLocLoading]   = useState(false)
  const [searchInput,  setSearchInput]  = useState(() => searchParams.get('q') ?? '')
  const [radiusValue,  setRadiusValue]  = useState(() => {
    const r = parseFloat(searchParams.get('radius') ?? '25')
    return isNaN(r) ? 25 : r
  })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Flaga "mapa faktycznie istnieje" — mapInstanceRef jest ref-em, więc jego
  // zmiana NIE odpala ponownie efektów. Bez tego, gdy strona otwiera się z
  // lat/lng w URL (np. z MiniMap po ustaleniu lokalizacji), efekt rysujący
  // niebieską pinezkę odpalał się RAZ, natychmiast po mount — zanim Leaflet
  // (dynamiczny import) zdążył się załadować i mapInstanceRef.current w ogóle
  // powstał. Efekt widział "mapy jeszcze nie ma", wychodził, i nigdy nie
  // dostawał drugiej szansy, bo urlCenter/userPosition już się nie zmieniały.
  // Stąd pinezka nie pojawiała się mimo poprawnie wycentrowanej mapy.
  const [mapReady, setMapReady] = useState(false)

  // Panel filtrów — domyślnie rozwinięty; zwijamy do cienkiego paska,
  // żeby mapa (h-screen pod spodem) dostała więcej widocznego miejsca.
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    if (hasLocation) setLocInput('Moja lokalizacja')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (locationBoxRef.current && !locationBoxRef.current.contains(e.target as Node)) {
        setLocResults([])
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then((data: Event[]) => {
        // Endpoint zwraca WSZYSTKIE opublikowane eventy (bez wymogu lat/lng) —
        // mapa potrzebuje tylko tych z lokalizacją, więc filtrujemy tu, tak jak
        // wcześniej robiło to zapytanie .not('latitude','is',null) w Supabase.
        // Przy okazji: to NAPRAWIA bug — poprzednie zapytanie mapy nie miało
        // filtra status='published' w ogóle (MobileHome i EventsGrid go miały),
        // więc mapa mogła pokazywać eventy pending/draft. Teraz endpoint
        // filtruje status po stronie serwera dla wszystkich trzech miejsc jednakowo.
        const withLocation = data.filter(e => e.latitude != null && e.longitude != null)
        setEvents(withLocation)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!mapRef.current || mapInstanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet.markercluster')

      const center = urlCenter ?? userPosition ?? ([54.1, 22.93] as [number, number])
      const map = L.map(mapRef.current!, { center, zoom: urlCenter ? 13 : 11, zoomControl: false })

      L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_KEY}`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd', maxZoom: 20,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapInstanceRef.current = map

      const mcg = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div style="width:40px;height:40px;border-radius:50%;background:#22C55E;color:black;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 12px rgba(34,197,94,0.5);">${count}</div>`,
            className: '', iconSize: [40, 40], iconAnchor: [20, 20],
          })
        },
        spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true,
      })

      markerGroupRef.current = mcg
      map.addLayer(mcg)

      // Sygnał dla efektu z pinezką: mapa istnieje, spróbuj jeszcze raz.
      setMapReady(true)
    }

    initMap()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerGroupRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveCenter = urlCenter ?? userPosition

  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (urlTime === 'dzis'    && !isToday(ev.next_date))       return false
      if (urlTime === 'jutro'   && !isTomorrow(ev.next_date))    return false
      if (urlTime === 'weekend' && !isThisWeekend(ev.next_date)) return false
      if (urlTime === 'custom' && customDate && !isSameLocalDate(ev.next_date, customDate)) return false
      if (activeCategories.size > 0 && !activeCategories.has(ev.category ?? 'Inne')) return false
      if (urlQ) {
        const hay = `${ev.title} ${ev.venue_name ?? ''}`.toLowerCase()
        if (!hay.includes(urlQ)) return false
      }
      const effectiveRadius = !isNaN(urlRadius) && urlRadius > 0 ? urlRadius : radiusValue
      if (effectiveRadius > 0 && effectiveCenter) {
        if (haversineKm(effectiveCenter[0], effectiveCenter[1], ev.latitude, ev.longitude) > effectiveRadius) return false
      }
      return true
    })
  }, [events, urlTime, activeCategories, urlQ, urlRadius, effectiveCenter, customDate, radiusValue])

  useEffect(() => {
    const mcg = markerGroupRef.current
    if (!mcg) return
    const refPos = urlCenter ?? userPosition
    import('leaflet').then(({ default: L }) => {
      mcg.clearLayers()
      // Pasek filtrów nachodzi na górę mapy, ale Leaflet o tym nie wie —
      // jego autoPan liczy tylko granice własnego kontenera. Mierzymy
      // rzeczywistą, bieżącą wysokość paska i mówimy Leafletowi, żeby
      // zostawiał tyle miejsca od góry przy przesuwaniu mapy pod popup.
      const topPadding = (filterBarRef.current?.offsetHeight ?? 60) + 12
      filtered.forEach(ev => {
        const color = getCategoryColor(ev.category)
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -25],
        })
        const marker = L.marker([ev.latitude, ev.longitude], { icon })

        const poster = ev.cover_image_url || ev.image_url
        const dist = refPos ? haversineKm(refPos[0], refPos[1], ev.latitude, ev.longitude) : null
        const place = ev.venue_name || ev.city || ''

        marker.bindPopup(`
          <div style="width:230px;font-family:system-ui,sans-serif">
            ${poster ? `<img src="${escapeHtml(poster)}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block" />` : ''}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
              ${ev.category ? `<span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${escapeHtml(getCategoryLabel(ev.category))}</span>` : ''}
              ${ev.is_free ? `<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">Wstęp wolny</span>` : ''}
            </div>
            <div style="font-weight:700;font-size:14px;line-height:1.3;margin-bottom:5px;color:#111">${escapeHtml(ev.title)}</div>
            <div style="font-size:11px;color:#666;margin-bottom:3px">${fmtDate(ev.next_date)}</div>
            ${place ? `<div style="font-size:11px;color:#888;margin-bottom:3px">${escapeHtml(place)}</div>` : ''}
            ${dist !== null ? `<div style="font-size:11px;font-weight:600;color:#16a34a;margin-bottom:8px">${formatDist(dist)}</div>` : '<div style="margin-bottom:8px"></div>'}
            <a href="/events/${escapeHtml(ev.slug)}" style="display:block;text-align:center;background:#22C55E;color:black;font-weight:700;font-size:11px;padding:7px;border-radius:8px;text-decoration:none">Zobacz wydarzenie</a>
          </div>
        `, { maxWidth: 260, autoPanPaddingTopLeft: L.point(12, topPadding), autoPanPaddingBottomRight: L.point(12, 12) })

        mcg.addLayer(marker)
      })
    })
  }, [filtered, urlCenter, userPosition, filtersOpen])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      if (userMarkerRef.current) userMarkerRef.current.remove()
      const pos = urlCenter ?? userPosition
      if (!pos) return
      const icon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      })
      userMarkerRef.current = L.marker(pos, { icon }).addTo(map)
    })
  }, [userPosition, urlCenter, mapReady])

  const categories = ['kultura', 'muzyka', 'sport', 'festyny']

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    router.replace(`/mapa?${params.toString()}`, { scroll: false })
  }

  function flyTo(lat: number, lng: number, zoom = 13) {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 })
  }

  function moveUserMarker(lat: number, lng: number) {
    const map = mapInstanceRef.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      if (userMarkerRef.current) userMarkerRef.current.remove()
      const icon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      })
      userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    })
  }

  function applyLocation(r: GeoResult) {
    setLocInput(r.label)
    setLocResults([])
    updateParams({ lat: r.lat.toFixed(6), lng: r.lng.toFixed(6) })
    flyTo(r.lat, r.lng)
    moveUserMarker(r.lat, r.lng)
  }

  async function runGeoSearch() {
    const q = locInput.trim()
    if (!q || q === 'Moja lokalizacja') return
    setLocLoading(true)
    try {
      const results = await searchNominatim(q)
      setLocResults(results)
      if (results.length === 1) applyLocation(results[0])
    } catch {
      setLocResults([])
    } finally {
      setLocLoading(false)
    }
  }

  function handleLocKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); runGeoSearch() }
    if (e.key === 'Escape') { setLocResults([]) }
  }

  function clearLocation() {
    setLocInput('')
    setLocResults([])
    updateParams({ lat: null, lng: null, radius: null })
  }

  function handleGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserPosition([lat, lng])
        setLocInput('Moja lokalizacja')
        setLocResults([])
        updateParams({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
        flyTo(lat, lng)
        moveUserMarker(lat, lng)
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
    )
  }

  function handleRadiusChange(value: number) {
    setRadiusValue(value)
    if (radiusTimerRef.current) clearTimeout(radiusTimerRef.current)
    radiusTimerRef.current = setTimeout(() => updateParams({ radius: String(value) }), 300)
  }

  function handleSearch(value: string) {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => updateParams({ q: value.trim() || null }), 400)
  }

  function handleTimeFilter(value: TimeFilter) {
    updateParams({ time: value === 'wszystkie' ? null : value })
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

  const activeTimeLabel = TIME_FILTERS.find(t => t.key === urlTime)?.label ?? 'Wszystkie'

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      <div ref={filterBarRef} className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-gray-200 px-3 py-2">

<Link href="/" className="flex items-center gap-2 mb-2">
  <div className="flex size-6 items-center justify-center rounded-lg bg-green-500">
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  </div>
  <span className="text-sm font-semibold tracking-tight text-black">evently</span>
</Link>

{filtersOpen ? (
          <div className="space-y-2">

            {/* Lokalizacja */}
            <div ref={locationBoxRef} className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <input
                    type="text"
                    value={locInput}
                    onChange={e => { setLocInput(e.target.value); setLocResults([]) }}
                    onFocus={() => { if (locInput === 'Moja lokalizacja') setLocInput('') }}
                    onKeyDown={handleLocKeyDown}
                    placeholder="Wpisz miasto i naciśnij Enter..."
                    className="w-full pl-8 pr-8 py-1.5 rounded-full text-sm border border-gray-200 bg-white
                      focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400
                      transition-colors text-black placeholder:text-gray-400"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {locLoading
                      ? <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      : (locInput
                        ? <button onClick={clearLocation} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
                        : null)
                    }
                  </div>
                </div>
                <button onClick={runGeoSearch} disabled={locLoading}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50">
                  Szukaj
                </button>
                <button onClick={handleGPS} disabled={gpsLoading} title="Użyj mojej lokalizacji"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {gpsLoading
                    ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                  }
                </button>
              </div>
              {locResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {locResults.map((r, i) => (
                    <button key={i} onClick={() => applyLocation(r)}
                      className="w-full text-left px-3 py-2.5 text-sm text-black hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors">
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Promień */}
            {hasLocation && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-gray-500 flex-shrink-0">Promień:</span>
                <input type="range" min="5" max="100" step="5"
                  value={radiusValue}
                  onChange={e => handleRadiusChange(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-green-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-black w-12 text-right flex-shrink-0">{radiusValue} km</span>
              </div>
            )}

            {/* Szukaj po nazwie */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" value={searchInput} onChange={e => handleSearch(e.target.value)}
                  placeholder="Szukaj po nazwie wydarzenia..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-full text-sm border border-gray-200 bg-white
                    focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400
                    transition-colors text-black placeholder:text-gray-400"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); updateParams({ q: null }) }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{filtered.length} wydarzeń</span>
            </div>

            {/* Czas */}
            <div className="flex gap-2 flex-wrap items-center">
              {TIME_FILTERS.map(({ key, label }) => (
                <button key={key} onClick={() => { handleTimeFilter(key); setCustomDate('') }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    urlTime === key ? 'bg-green-500 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}>
                  {label}
                </button>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() } }}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    urlTime === 'custom'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-gray-100 text-black border-gray-200 hover:bg-gray-200'
                  }`}>
                  📅 {urlTime === 'custom' && customDate
                    ? new Date(customDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
                    : 'Kalendarz'}
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="sr-only"
                  tabIndex={-1}
                  value={customDate}
                  onChange={e => {
                    setCustomDate(e.target.value)
                    updateParams({ time: 'custom' })
                  }}
                />
              </div>
            </div>

            {/* Kategorie */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => {
                const color = getCategoryColor(cat)
                const active = activeCategories.has(cat)
                return (
                  <button key={cat} onClick={() => handleToggleCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? 'text-white border-transparent shadow-sm' : 'bg-white text-black border-gray-200 hover:border-gray-300'
                    }`}
                    style={active ? { backgroundColor: color, borderColor: color } : {}}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {getCategoryLabel(cat)}
                  </button>
                )
              })}
            </div>

            {/* Zwiń */}
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 pt-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
              </svg>
              Ukryj filtry
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                {activeTimeLabel}
              </span>
              {activeCategories.size > 0 && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {activeCategories.size} {activeCategories.size === 1 ? 'kategoria' : 'kategorie'}
                </span>
              )}
              <span className="text-xs text-gray-500 flex-shrink-0">{filtered.length} wydarzeń</span>
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
            >
              Filtry
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        )}
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
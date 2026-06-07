'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

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
  Kultura: '#8B5CF6', Muzyka: '#EF4444', Sport: '#3B82F6',
  Jedzenie: '#F97316', Rodzinne: '#EC4899', Technologia: '#06B6D4', Inne: '#6B7280',
}
const DEFAULT_COLOR = '#22C55E'

function getCategoryColor(cat: string | null) {
  if (!cat) return DEFAULT_COLOR
  return CATEGORY_COLORS[cat] ?? DEFAULT_COLOR
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isToday(d: string) {
  const a = new Date(d), b = new Date()
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isTomorrow(d: string) {
  const a = new Date(d), b = new Date(); b.setDate(b.getDate() + 1)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isThisWeekend(d: string) { const day = new Date(d).getDay(); return day === 0 || day === 6 }

type TimeFilter = 'wszystkie' | 'dzis' | 'jutro' | 'weekend'

export default function EventMap() {
  const searchParams = useSearchParams()
  const urlLat = parseFloat(searchParams.get('lat') || '')
  const urlLng = parseFloat(searchParams.get('lng') || '')
  const urlCenter: [number, number] | null = (!isNaN(urlLat) && !isNaN(urlLng)) ? [urlLat, urlLng] : null

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerGroupRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('wszystkie')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)

  // Pobierz eventy
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
        () => {}
      )
    }
  }, [])

  // Inicjalizuj mapę
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css')

      const center = urlCenter ?? userPosition ?? [54.1, 22.93] as [number, number]

      const map = L.map(mapRef.current!, {
        center,
        zoom: urlCenter ? 13 : 11,
        zoomControl: false,
      })

      // CartoDB Dark Matter — ciemna mapa
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map

      // Klastry
      const mcg = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div style="
              width: 40px; height: 40px; border-radius: 50%;
              background: #22C55E; color: black;
              display: flex; align-items: center; justify-content: center;
              font-weight: 800; font-size: 14px;
              border: 3px solid rgba(255,255,255,0.3);
              box-shadow: 0 2px 12px rgba(34,197,94,0.5);
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
  }, [])

  // Aktualizuj markery przy zmianie filtrów
  const filtered = useMemo(() => {
    return events.filter(e => {
      if (timeFilter === 'dzis' && !isToday(e.start_date)) return false
      if (timeFilter === 'jutro' && !isTomorrow(e.start_date)) return false
      if (timeFilter === 'weekend' && !isThisWeekend(e.start_date)) return false
      if (activeCategories.size > 0 && !activeCategories.has(e.category ?? 'Inne')) return false
      return true
    })
  }, [events, timeFilter, activeCategories])

  useEffect(() => {
    const mcg = markerGroupRef.current
    const L = (window as any).L
    if (!mcg || !L) return

    mcg.clearLayers()

    filtered.forEach(ev => {
      const color = getCategoryColor(ev.category)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
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
          <a href="/events/${ev.slug}" style="display:block;text-align:center;background:#22C55E;color:black;font-weight:700;font-size:11px;padding:6px;border-radius:8px;text-decoration:none">
            Zobacz wydarzenie
          </a>
        </div>
      `)
      mcg.addLayer(marker)
    })
  }, [filtered])

  // Marker użytkownika
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    import('leaflet').then(({ default: L }) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
      }
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

  const categories = useMemo(() => {
    const set = new Set(events.map(e => e.category ?? 'Inne'))
    return Array.from(set).sort()
  }, [events])

  function toggleCategory(cat: string) {
    setActiveCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
    { key: 'wszystkie', label: 'Wszystkie' },
    { key: 'dzis', label: 'Dziś' },
    { key: 'jutro', label: 'Jutro' },
    { key: 'weekend', label: 'Weekend' },
  ]

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[#1a1a2e]">
      {/* Filtry */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-2 flex-wrap mb-2">
          {TIME_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setTimeFilter(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                timeFilter === key ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500 self-center">{filtered.length} wydarzeń</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => {
            const color = getCategoryColor(cat)
            const active = activeCategories.has(cat)
            return (
              <button key={cat} onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : {}}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-zinc-900">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      )}

      <div ref={mapRef} className="flex-1 w-full" style={{ height: '100vh' }} />
    </div>
  )
}
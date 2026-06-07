'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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

function getCategoryColor(category: string | null): string {
  if (!category) return DEFAULT_COLOR
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR
}

function createPin(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -30],
  })
}

const userIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

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

function MapBoundsUpdater({ events }: { events: Event[] }) {
  const map = useMap()
  useEffect(() => {
    if (events.length === 0) return
    const bounds = L.latLngBounds(events.map((e) => [e.latitude, e.longitude]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [events, map])
  return null
}

type TimeFilter = 'wszystkie' | 'dzis' | 'jutro' | 'weekend'

function isToday(dateStr: string) {
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function isTomorrow(dateStr: string) {
  const d = new Date(dateStr), t = new Date()
  t.setDate(t.getDate() + 1)
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function isThisWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EventMap() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('wszystkie')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    async function load() {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, slug, category, start_date, venue_name, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('start_date', { ascending: true })
      if (!error && data) setEvents(data as Event[])
      setLoading(false)
    }
    load()

    // Pobierz lokalizację użytkownika
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(events.map((e) => e.category ?? 'Inne'))
    return Array.from(set).sort()
  }, [events])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (timeFilter === 'dzis' && !isToday(e.start_date)) return false
      if (timeFilter === 'jutro' && !isTomorrow(e.start_date)) return false
      if (timeFilter === 'weekend' && !isThisWeekend(e.start_date)) return false
      if (activeCategories.size > 0 && !activeCategories.has(e.category ?? 'Inne')) return false
      return true
    })
  }, [events, timeFilter, activeCategories])

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
    { key: 'wszystkie', label: 'Wszystkie' },
    { key: 'dzis', label: 'Dziś' },
    { key: 'jutro', label: 'Jutro' },
    { key: 'weekend', label: 'Weekend' },
  ]

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm shadow-md px-3 py-2">
        <div className="flex gap-2 flex-wrap mb-2">
          {TIME_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                timeFilter === key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">
            {filtered.length} wydarzeń
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const color = getCategoryColor(cat)
            const active = activeCategories.has(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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

      <MapContainer
        center={[54.1, 22.93]}
        zoom={11}
        className="flex-1 w-full"
        style={{ height: '100vh', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater events={filtered} />
        {filtered.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={createPin(getCategoryColor(event.category))}
          >
            <Popup minWidth={200}>
              <div className="p-1">
                {event.category && (
                  <span
                    className="inline-block text-white text-xs px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: getCategoryColor(event.category) }}
                  >
                    {event.category}
                  </span>
                )}
                <p className="font-semibold text-gray-900 text-sm leading-tight mb-1">{event.title}</p>
                <p className="text-xs text-gray-500 mb-1">{formatDate(event.start_date)}</p>
                {event.venue_name && <p className="text-xs text-gray-400 mb-2">{event.venue_name}</p>}
                <Link
                  href={`/events/${event.slug}`}
                  className="block text-center bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                >
                  Zobacz wydarzenie
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        {userPosition && (
          <Marker position={userPosition} icon={userIcon} />
        )}
      </MapContainer>
    </div>
  )
}
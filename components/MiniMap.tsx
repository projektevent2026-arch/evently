"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [0, -32],
})

const userIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

interface Event {
  id: string
  slug: string
  title: string
  start_date: string
  city: string
  latitude: number
  longitude: number
}

interface MiniMapProps {
  center?: [number, number]
}

const DEFAULT_CENTER: [number, number] = [54.1116, 22.9302]

export default function MiniMap({ center: externalCenter }: MiniMapProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const center = externalCenter ?? DEFAULT_CENTER

  const mapaHref = externalCenter
    ? `/mapa?lat=${externalCenter[0]}&lng=${externalCenter[1]}`
    : '/mapa'

  useEffect(() => {
    async function fetchEvents() {
      const { createBrowserClient } = await import("@supabase/ssr")
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, start_date, city, latitude, longitude")
        .eq("status", "published")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(20)
      setEvents(data || [])
      setLoading(false)
    }
    fetchEvents()
  }, [])

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })

  if (loading) {
    return (
      <div style={{ height: 200, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>Ładowanie mapy...</span>
      </div>
    )
  }

  return (
    <div>
      <a href={mapaHref} style={{ display: "block", cursor: "pointer" }}>
        <MapContainer
          key={`${center[0]}-${center[1]}`}
          center={center}
          zoom={11}
          style={{ height: 200, borderRadius: 10, zIndex: 0, pointerEvents: "none" }}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          {events.map((ev) => (
            <Marker key={ev.id} position={[ev.latitude, ev.longitude]} icon={icon}>
              <Popup>
                <div style={{ fontSize: 12, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{ev.title}</div>
                  <div style={{ color: "#6b7280", marginBottom: 6 }}>
                    {fmtDate(ev.start_date)} · {ev.city}
                  </div>
                  <a href={`/events/${ev.slug}`} style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
                    Zobacz
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
          <Marker position={center} icon={userIcon} />
        </MapContainer>
      </a>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
        {events.length} wydarzeń na mapie ·{" "}
        <a href={mapaHref} style={{ color: "#16a34a", fontWeight: 600 }}>
          otwórz mapę
        </a>
      </p>
    </div>
  )
}
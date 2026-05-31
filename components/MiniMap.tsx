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

interface Event {
  id: string
  slug: string
  title: string
  start_date: string
  city: string
  latitude: number
  longitude: number
}

export default function MiniMap() {
  const [events, setEvents] = useState<Event[]>([])
  const [center, setCenter] = useState<[number, number]>([54.1116, 22.9302])
  const [loading, setLoading] = useState(true)

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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
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
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: 200, borderRadius: 10, zIndex: 0 }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        {events.map((ev) => (
          <Marker key={ev.id} position={[ev.latitude, ev.longitude]} icon={icon}>
            <Popup>
              <div style={{ fontSize: 12, minWidth: 140 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{ev.title}</div>
                <div style={{ color: "#6b7280", marginBottom: 6 }}>
                  📅 {fmtDate(ev.start_date)} · {ev.city}
                </div>
                <a href={`/events/${ev.slug}`} style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>
                  Zobacz →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
        {events.length} wydarzeń na mapie · kliknij pinezkę
      </p>
    </div>
  )
}
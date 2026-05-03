"use client"

import { useEffect } from "react"

interface EventMapProps {
  city: string
  location?: string
}

export function EventMap({ city, location }: EventMapProps) {
  useEffect(() => {
    import("leaflet").then((L) => {
      const container = document.getElementById("map") as any
      if (container?._leaflet_id) return

      const map = L.map("map").setView([52.2297, 21.0122], 13)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      // Naprawiona ikona pinezki
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })

      const query = location ? `${location}, ${city}` : city
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
        .then((r) => r.json())
        .then((data) => {
          if (data[0]) {
            const lat = parseFloat(data[0].lat)
            const lon = parseFloat(data[0].lon)
            map.setView([lat, lon], 16)
            L.marker([lat, lon], { icon }).addTo(map).bindPopup(query).openPopup()
          }
        })
    })
  }, [city, location, latitude, longitude])

  return (
    <div
      id="map"
      style={{ height: "300px", width: "100%", borderRadius: "12px", zIndex: 0 }}
    />
  )
}
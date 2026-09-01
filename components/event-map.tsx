"use client"

import { useEffect } from "react"

interface EventMapProps {
  city: string
  location?: string
  latitude?: number | null
  longitude?: number | null
}

export function EventMap({ city, location, latitude, longitude }: EventMapProps) {
  useEffect(() => {
    import("leaflet").then((L) => {
      const container = document.getElementById("map") as any
      if (container?._leaflet_id) return

      const map = L.map("map").setView([52.2297, 21.0122], 13)

      // CARTO (voyager) zamiast surowego tile.openstreetmap.org — ten drugi to
      // oficjalny serwer TESTOWY OSM z nieformalną polityką "nie dla produkcji"
      // i ryzykiem zablokowania IP/User-Agenta przy większym ruchu. CARTO ma
      // darmowy, hojny limit (5 mln zapytań/miesiąc) w zamian za widoczną
      // atrybucję poniżej — to spójne z EventMap.tsx (mapa /mapa).
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_KEY}`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map)

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })

      const label = location ? `${location}, ${city}` : city

      if (latitude && longitude) {
        map.setView([latitude, longitude], 16)
        L.marker([latitude, longitude], { icon }).addTo(map).bindPopup(label).openPopup()
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=json&limit=1`)
          .then((r) => r.json())
          .then((data) => {
            if (data[0]) {
              const lat = parseFloat(data[0].lat)
              const lon = parseFloat(data[0].lon)
              map.setView([lat, lon], 16)
              L.marker([lat, lon], { icon }).addTo(map).bindPopup(label).openPopup()
            }
          })
      }
    })
  }, [city, location, latitude, longitude])

  return (
    <div
      id="map"
      style={{ height: "300px", width: "100%", borderRadius: "12px", zIndex: 0 }}
    />
  )
}
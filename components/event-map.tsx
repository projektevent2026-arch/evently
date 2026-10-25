"use client"

import { useEffect, useRef } from "react"

interface EventMapProps {
  city: string
  location?: string
  latitude?: number | null
  longitude?: number | null
}

export function EventMap({ city, location, latitude, longitude }: EventMapProps) {
  // 2026-10-25: kontener przez ref zamiast document.getElementById("map").
  // Stałe id "map" kolidowało, gdy na stronie są dwa układy (desktop i mobile):
  // getElementById zwraca pierwszy element, a ten może być ukryty (rozmiar 0).
  // Dodatkowo mapa nie była nigdzie sprzątana (brak map.remove()), więc po zmianie
  // propsów efekt wychodził na "_leaflet_id" i nie przesuwał mapy do nowego punktu.
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let map: any = null
    let resizeObserver: ResizeObserver | null = null

    import("leaflet").then((L) => {
      const container = containerRef.current
      if (cancelled || !container) return

      // zoomControl wyłączony: domyślnie jest w lewym górnym rogu i zasłaniał
      // dymek z adresem (dymek otwiera się nad pinezką, czyli w tym samym miejscu).
      // Prawy dolny róg jest spójny z mapą /mapa (EventMap.tsx).
      map = L.map(container, { zoomControl: false }).setView([52.2297, 21.0122], 13)
      L.control.zoom({ position: "bottomright" }).addTo(map)

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

      // Gdy mapa startuje w ukrytej zakładce lub zmienia rozmiar (obrót telefonu),
      // Leaflet musi przeliczyć rozmiar, inaczej kafelki i środek są przesunięte.
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => map?.invalidateSize())
        resizeObserver.observe(container)
      }

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })

      const label = location ? `${location}, ${city}` : city
      const popupOptions = { maxWidth: 240, autoPanPadding: L.point(16, 16) }

      if (latitude && longitude) {
        map.setView([latitude, longitude], 16)
        L.marker([latitude, longitude], { icon }).addTo(map).bindPopup(label, popupOptions).openPopup()
      } else {
        // 2026-09-20: to samo co w MobileHome.tsx / location-sidebar.tsx /
        // EventMap.tsx (/mapa) — request szedł wprost z przeglądarki do
        // Nominatim, z pominięciem rate limitera i bez działającego
        // User-Agent (przeglądarki i tak go nadpisują). Ten plik umknął przy
        // pierwszej poprawce, bo nazwa różni się od EventMap.tsx tylko
        // wielkością liter i myślnikiem — a jest używany na KAŻDEJ stronie
        // pojedynczego wydarzenia (desktop i mobile), więc częściej niż
        // tamten.
        fetch(`/api/nominatim?op=search&q=${encodeURIComponent(label)}&limit=1`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data) => {
            if (cancelled || !map || !Array.isArray(data) || !data[0]) return
            const lat = parseFloat(data[0].lat)
            const lon = parseFloat(data[0].lon)
            map.setView([lat, lon], 16)
            L.marker([lat, lon], { icon }).addTo(map).bindPopup(label, popupOptions).openPopup()
          })
          .catch(() => {})
      }
    })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (map) {
        map.remove()
        map = null
      }
    }
  }, [city, location, latitude, longitude])

  return (
    <div
      ref={containerRef}
      style={{ height: "300px", width: "100%", borderRadius: "12px", zIndex: 0 }}
    />
  )
}
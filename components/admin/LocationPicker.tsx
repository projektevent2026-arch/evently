'use client'

import { useEffect, useRef, useState } from 'react'

interface LocationPickerProps {
  latitude: string
  longitude: string
  onChange: (lat: string, lng: string) => void
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const zoomControlRef = useRef<any>(null)
  const pendingCenterRef = useRef<any>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFullscreenRef = useRef(false)
  const savedPositionRef = useRef<{ lat: string; lng: string } | null>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [liveCoords, setLiveCoords] = useState('')

  const defaultLat = 54.1116
  const defaultLng = 22.9302

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return

    const L = require('leaflet')

    // Fix ikony Leaflet w Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const initLat = latitude ? parseFloat(latitude) : defaultLat
    const initLng = longitude ? parseFloat(longitude) : defaultLng

    // Własna kontrolka powiększenia zamiast domyślnej — żeby móc ją
    // przełączać między rogami przez setPosition() (mała mapa: prawy górny,
    // pełny ekran: prawy dolny — patrz openFullscreen/closeFullscreen).
    const map = L.map(mapRef.current, { zoomControl: false }).setView([initLat, initLng], 13)
    mapInstanceRef.current = map
    zoomControlRef.current = L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    if (latitude && longitude) {
      markerRef.current = L.marker([initLat, initLng]).addTo(map)
    }

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      const latStr = lat.toFixed(6)
      const lngStr = lng.toFixed(6)

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }

      if (isFullscreenRef.current) {
        // W trybie pełnoekranowym nie zapisujemy od razu do formularza —
        // czekamy na "Zatwierdź lokalizację" albo "✕" (patrz closeFullscreen).
        // Ale to oznacza, że onChange się tu nie woła, więc mechanizm centrujący
        // mapę (osobny useEffect obserwujący propsy latitude/longitude) nigdy
        // się w pełnym ekranie nie uruchamia — mała mapa centruje się na klik,
        // duża nie. Centrujemy więc wprost, tutaj, na miejscu.
        setLiveCoords(`${latStr}, ${lngStr}`)
        map.setView([lat, lng], map.getZoom())
      } else {
        onChange(latStr, lngStr)
      }
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Aktualizuj pozycję markera gdy zmienią się props (np. po geocodingu)
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return
    const L = require('leaflet')
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
    }
    mapInstanceRef.current.setView([lat, lng], 15)
  }, [latitude, longitude])

  // Leaflet nie widzi zmiany rozmiaru kontenera samoistnie. Zamiast zgadywać
  // czas (RAF / setTimeout — to podejście powodowało wyścig z cleanupem effectu
  // i realnie psuło też małą mapę), obserwujemy FAKTYCZNĄ zmianę rozmiaru
  // kontenera przez ResizeObserver i wtedy dopiero wołamy invalidateSize().
  // Działa identycznie dla przejścia w pełny ekran, powrotu, i dowolnej innej
  // zmiany rozmiaru (np. resize okna) — nie zależy już od isFullscreen.
  useEffect(() => {
    const map = mapInstanceRef.current
    const container = mapRef.current
    if (!map || !container) return

    let raf = 0
    const invalidate = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true })

        // Centrowanie na pinezce po wejściu w pełny ekran (patrz openFullscreen) —
        // wykonywane TU, nie tam, bo to jest miejsce, które faktycznie widzi
        // KAŻDĄ zmianę rozmiaru kontenera, łącznie z tym powolnym "osiadaniem".
        // Debounce 200ms: dopiero gdy przez 200ms nie przyjdzie kolejne zdarzenie
        // resize, uznajemy że się ustabilizowało i centrujemy — raz, na końcu.
        if (pendingCenterRef.current) {
          if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
          settleTimerRef.current = setTimeout(() => {
            const pos = pendingCenterRef.current
            const m = mapInstanceRef.current
            if (pos && m) {
              m.invalidateSize({ pan: false })
              m.setView(pos, m.getZoom(), { animate: false })
            }
            pendingCenterRef.current = null
          }, 200)
        }
      })
    }

    const observer = new ResizeObserver(invalidate)
    observer.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const openFullscreen = () => {
    // Nie centrujemy tu na sztywno ustalony czas (rAF/timeout) — logi pokazały,
    // że po wejściu w pełny ekran kontener "drga" (kilkanaście kolejnych zdarzeń
    // resize z rzędu, prawdopodobnie pasek adresu przeglądarki na telefonie
    // jeszcze się chowa/pokazuje). Każde takie zdarzenie woła invalidateSize
    // z pan:false, co cichutko przesuwało widok PO tym, jak już raz wycentrowałem.
    // Zamiast zgadywać moment — zlecamy centrowanie ResizeObserverowi (niżej),
    // który sam wykona je RAZ, dopiero gdy drganie faktycznie się uspokoi.
    const markerPos = markerRef.current?.getLatLng()
    pendingCenterRef.current = markerPos ?? null

    savedPositionRef.current = { lat: latitude, lng: longitude }
    setLiveCoords(latitude && longitude ? `${latitude}, ${longitude}` : '')
    isFullscreenRef.current = true
    setIsFullscreen(true)
    zoomControlRef.current?.setPosition('bottomright')
  }

  const closeFullscreen = (confirmed: boolean) => {
    if (confirmed) {
      if (liveCoords) {
        const [lat, lng] = liveCoords.split(',').map(s => s.trim())
        onChange(lat, lng)
      }
    } else {
      // ✕ = anuluj — cofnij do pozycji sprzed otwarcia pełnego ekranu
      const saved = savedPositionRef.current
      if (saved && saved.lat && saved.lng) {
        const lat = parseFloat(saved.lat)
        const lng = parseFloat(saved.lng)
        markerRef.current?.setLatLng([lat, lng])
        mapInstanceRef.current?.setView([lat, lng], mapInstanceRef.current.getZoom())
      } else if (markerRef.current) {
        // Nie było wcześniej ustawionej lokalizacji — usuń pinezkę dodaną w trybie pełnoekranowym
        mapInstanceRef.current?.removeLayer(markerRef.current)
        markerRef.current = null
      }
    }
    isFullscreenRef.current = false
    setIsFullscreen(false)
    // Powrót do małej mapy — kontrolka wraca na swoje miejsce w prawym górnym rogu.
    zoomControlRef.current?.setPosition('topright')
  }

  return (
    <div>
      <style>{`
        .lp-map-box { height: 280px; }
        @media (min-width: 1100px) {
          .lp-map-box { height: 400px; }
        }
        /* W pełnym ekranie prawy dolny róg nachodzi na pasek "Zatwierdź
           lokalizację" (pełna szerokość) — kontrolka potrzebuje odstępu,
           żeby nie wylądować pod przyciskiem. */
        .lp-fullscreen .leaflet-bottom.leaflet-right {
          margin-bottom: 130px;
        }
      `}</style>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 8px' }}>
        Kliknij na mapie aby ustawić lokalizację
      </p>

      <div
        className={isFullscreen ? 'lp-fullscreen' : undefined}
        style={
          isFullscreen
            ? { position: 'fixed', inset: 0, zIndex: 1000, background: 'white', display: 'flex', flexDirection: 'column' }
            : { position: 'relative' }
        }
      >
        {isFullscreen && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001,
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(white, rgba(255,255,255,0))', pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#111827', background: 'white',
              padding: '7px 14px', borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', pointerEvents: 'auto',
            }}>
              Ustaw dokładny punkt
            </span>
            <button
              type="button"
              onClick={() => closeFullscreen(false)}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'white',
                fontSize: 18, fontWeight: 700, color: '#111827',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', pointerEvents: 'auto',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div
          ref={mapRef}
          className="lp-map-box"
          style={
            isFullscreen
              ? { flex: 1, width: '100%', zIndex: 0 }
              : { width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', zIndex: 0 }
          }
        />

        {!isFullscreen && (
          <button
            type="button"
            onClick={openFullscreen}
            style={{
              position: 'absolute', right: 10, bottom: 10, display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: 'none', borderRadius: 8, padding: '9px 13px', fontSize: 13,
              fontWeight: 600, color: '#16a34a', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 2,
            }}
          >
            ⛶ Powiększ
          </button>
        )}

        {isFullscreen && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1001,
            padding: 16, background: 'linear-gradient(rgba(255,255,255,0), white 40%)',
          }}>
            {liveCoords && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                {liveCoords}
              </div>
            )}
            <button
              type="button"
              onClick={() => closeFullscreen(true)}
              disabled={!liveCoords}
              style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 12,
                background: liveCoords ? '#16a34a' : '#d1fae5',
                color: liveCoords ? 'white' : '#6b7280',
                fontSize: 15, fontWeight: 700, cursor: liveCoords ? 'pointer' : 'default',
                boxShadow: liveCoords ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
              }}
            >
              Zatwierdź lokalizację
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useRef } from 'react'

interface LocationPickerProps {
  latitude: string
  longitude: string
  onChange: (lat: string, lng: string) => void
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

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

    const map = L.map(mapRef.current).setView([initLat, initLng], 13)
    mapInstanceRef.current = map

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

      onChange(latStr, lngStr)
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

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 8px' }}>
        Kliknij na mapie aby ustawić lokalizację
      </p>
      <div
        ref={mapRef}
        style={{ width: '100%', height: 280, borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}
      />
    </div>
  )
}
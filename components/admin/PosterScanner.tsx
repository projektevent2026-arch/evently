'use client'

import { useState, useRef } from 'react'

interface ScanResult {
  title?: string
  city?: string
  address?: string
  venue_name?: string
  start_date?: string
  start_time?: string
  end_date?: string
  end_time?: string
  description?: string
  organizer_name?: string
  category?: string
  is_free?: boolean
  price_from?: number | null
}

interface PosterScannerProps {
  onScanComplete: (data: ScanResult) => void
}

export default function PosterScanner({ onScanComplete }: PosterScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const compressImage = (file: File): Promise<{ base64: string; mediaType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 1200
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.8)
          resolve({ base64: compressed.split(',')[1], mediaType: 'image/jpeg' })
        }
        img.src = e.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setStatus('Tylko pliki graficzne'); return }
    setScanning(true)
    setStatus('Kompresuję i analizuję...')
    try {
      const { base64, mediaType } = await compressImage(file)
      const res = await fetch('/api/scan-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      })
      const data = await res.json()
      if (data.error) { setStatus('Błąd: ' + data.error) }
      else { setStatus('✅ Formularz wypełniony automatycznie'); onScanComplete(data) }
    } catch {
      setStatus('Błąd połączenia z AI')
    }
    setScanning(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <style>{`
        .scanner-gallery-btn { width: 100%; }
        .scanner-camera-btn { display: flex; }
        @media (hover: hover) {
          .scanner-gallery-btn { width: 100%; }
          .scanner-camera-btn { display: none; }
        }
        @media (hover: none) {
          .scanner-gallery-btn { flex: 1; }
        }
      `}</style>

      {scanning ? (
        <div style={{ width: '100%', padding: '0.75rem', border: '2px dashed #16a34a', borderRadius: 10, background: '#f0fdf4', fontSize: '0.875rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          🔍 Analizuję plakat...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="scanner-gallery-btn"
            onClick={() => inputRef.current?.click()}
            style={{ padding: '0.75rem', border: '2px dashed #16a34a', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            🤖 Skanuj plakat AI
          </button>
          <button
            type="button"
            className="scanner-camera-btn"
            onClick={() => cameraRef.current?.click()}
            style={{ flex: 1, padding: '0.75rem', border: '2px dashed #16a34a', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#16a34a', fontWeight: 600, alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            📷 Aparat
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />

      {status && (
        <p style={{ fontSize: '0.8rem', color: status.startsWith('✅') ? '#16a34a' : '#ef4444', marginTop: 6 }}>
          {status}
        </p>
      )}
    </div>
  )
}
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setStatus('Tylko pliki graficzne')
      return
    }

    setScanning(true)
    setStatus('Analizuję plakat...')

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const mediaType = file.type

      try {
        const res = await fetch('/api/scan-poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })

        const data = await res.json()

        if (data.error) {
          setStatus('Błąd: ' + data.error)
        } else {
          setStatus('✅ Formularz wypełniony automatycznie')
          onScanComplete(data)
        }
      } catch {
        setStatus('Błąd połączenia z AI')
      }

      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '2px dashed #16a34a',
          borderRadius: 10,
          background: scanning ? '#f0fdf4' : 'white',
          cursor: scanning ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          color: '#16a34a',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {scanning ? '🔍 Analizuję plakat...' : '🤖 Skanuj plakat AI'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {status && (
        <p style={{ fontSize: '0.8rem', color: status.startsWith('✅') ? '#16a34a' : '#ef4444', marginTop: 6 }}>
          {status}
        </p>
      )}
    </div>
  )
}
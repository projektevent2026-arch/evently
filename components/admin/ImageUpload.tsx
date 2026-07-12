'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  onUploadComplete: (url: string) => void
  currentUrl?: string
}

// Kompresja PRZED wysłaniem do Storage.
// Skaner AI dostaje ORYGINAŁ (ostry tekst = poprawny odczyt) — to osobna ścieżka
// w PosterScanner.tsx. Tutaj kompresujemy tylko to, co ląduje w bazie i będzie
// serwowane userom: WebP, max 1400px, jakość 0.82.
// Efekt: plakat 800 kB -> ~120 kB. Strona główna schudnie z ~16 MB do ~2-3 MB.
const MAX_DIMENSION = 1400
const WEBP_QUALITY = 0.82

async function compressToWebP(file: File): Promise<{ blob: Blob; ext: string }> {
  // Wczytaj obraz
  const bitmap = await createImageBitmap(file)

  // Przeskaluj z zachowaniem proporcji (tylko w dół — nie powiększamy)
  let { width, height } = bitmap
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Brak kontekstu canvas')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // WebP; jeśli przeglądarka go nie wspiera, canvas zwróci PNG — wtedy fallback na JPEG.
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
  )

  if (blob && blob.type === 'image/webp') {
    return { blob, ext: 'webp' }
  }

  // Fallback: JPEG (starsze Safari)
  const jpeg = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  )
  if (!jpeg) throw new Error('Kompresja nieudana')
  return { blob: jpeg, ext: 'jpg' }
}

export default function ImageUpload({ onUploadComplete, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Tylko pliki graficzne (JPG, PNG, WebP)')
      return
    }
    // Limit podniesiony — i tak kompresujemy przed wysłaniem.
    if (file.size > 15 * 1024 * 1024) {
      setError('Maksymalny rozmiar: 15 MB')
      return
    }

    setError(null)
    setInfo(null)
    setUploading(true)

    try {
      const before = file.size

      // 1) Kompresja (WebP, max 1400px)
      const { blob, ext } = await compressToWebP(file)

      // 2) Upload skompresowanego
      const fileName = `event_${Date.now()}.${ext}`
      const { data, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, blob, {
          upsert: true,
          contentType: blob.type,
          cacheControl: '31536000', // 1 rok — plakaty się nie zmieniają
        })

      if (uploadError) {
        setError('Upload nieudany: ' + uploadError.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(data.path)

      const kb = (n: number) => Math.round(n / 1024)
      setInfo(`Skompresowano: ${kb(before)} kB → ${kb(blob.size)} kB`)

      onUploadComplete(urlData.publicUrl)
    } catch (err: any) {
      console.error('[Evently] Kompresja/upload nieudany:', err)
      setError('Nie udało się przetworzyć zdjęcia. Spróbuj innego pliku.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%',
          padding: '0.65rem',
          border: '2px dashed #d1d5db',
          borderRadius: 8,
          background: 'white',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: 8,
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? '⏳ Kompresja i wysyłanie...' : '📷 Wgraj zdjęcie z dysku'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '4px 0' }}>{error}</p>}
      {info && <p style={{ color: '#16a34a', fontSize: '0.75rem', margin: '4px 0' }}>✓ {info}</p>}
    </div>
  )
}
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  onUploadComplete: (url: string) => void
  currentUrl?: string
}

export default function ImageUpload({ onUploadComplete, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Tylko pliki graficzne (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maksymalny rozmiar: 5 MB')
      return
    }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `event_${Date.now()}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError('Upload nieudany: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(data.path)

    onUploadComplete(urlData.publicUrl)
    setUploading(false)
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
        {uploading ? '⏳ Wysyłanie...' : '📷 Wgraj zdjęcie z dysku'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '4px 0' }}>{error}</p>}
    </div>
  )
}
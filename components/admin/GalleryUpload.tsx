'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Galeria zdjęć wydarzenia: do 6 sztuk, kompresja do WebP przed wysłaniem (tak samo jak ImageUpload),
// usuwanie i zmiana kolejności. Komponent jest sterowany z zewnątrz: dostaje listę adresów (value)
// i zgłasza nową listę przez onChange. Zapis do bazy robi rodzic (formularz admina zapisuje przy
// "Zapisz", panel organizatora zapisuje od razu po każdej zmianie).
//
// Baza (events.gallery_urls + funkcja gallery_urls_ok) przyjmuje wyłącznie adresy z naszego bucketu
// event-images i maksymalnie 6 pozycji, więc tu nie ma opcji "wklej URL".
//
// onChange może zwrócić false (np. zapis do bazy się nie udał) — wtedy przerywamy wysyłanie kolejnych zdjęć.

export const GALLERY_MAX = 6
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.82
const MAX_FILE_BYTES = 15 * 1024 * 1024
const COMPRESSION_TIMEOUT_MS = 20000
const UPLOAD_TIMEOUT_MS = 45000
const ALLOWED_ORIGINAL_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) }
    )
  })
}

async function compressToWebP(file: File): Promise<{ blob: Blob; ext: string }> {
  const bitmap = await createImageBitmap(file)
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

  const webp = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', WEBP_QUALITY))
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }

  // Starsze Safari nie koduje WebP — wtedy JPEG.
  const jpeg = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85))
  if (!jpeg) throw new Error('Kompresja nieudana')
  return { blob: jpeg, ext: 'jpg' }
}

function extFromType(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

interface GalleryUploadProps {
  value: string[]
  onChange: (next: string[]) => void | boolean | Promise<void | boolean>
  max?: number
  dark?: boolean
  disabled?: boolean
}

export default function GalleryUpload({ value, onChange, max = GALLERY_MAX, dark = false, disabled = false }: GalleryUploadProps) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const list = Array.isArray(value) ? value : []
  const locked = busy || disabled

  const c = dark
    ? { text: '#d1d5db', muted: '#9ca3af', border: '#333', bg: '#0f0f0f', btnBg: '#1f1f1f', btnText: 'white', thumbBg: '#1f1f1f' }
    : { text: '#374151', muted: '#6b7280', border: '#d1d5db', bg: 'white', btnBg: 'white', btnText: '#374151', thumbBg: '#f3f4f6' }

  async function commit(next: string[]): Promise<boolean> {
    const result = await onChange(next)
    return result !== false
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // pozwala wybrać ten sam plik ponownie
    if (files.length === 0) return

    setError(null)
    setStatus(null)

    const free = max - list.length
    if (free <= 0) {
      setError(`Limit to ${max} zdjęć. Usuń któreś, żeby dodać nowe.`)
      return
    }
    const batch = files.slice(0, free)
    const skippedForLimit = files.length - batch.length

    setBusy(true)
    let current = list
    let added = 0
    const problems: string[] = []

    try {
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i]
        setStatus(`Wysyłanie ${i + 1} z ${batch.length}…`)

        if (!file.type.startsWith('image/')) { problems.push(`${file.name}: to nie jest zdjęcie`); continue }
        if (file.size > MAX_FILE_BYTES) { problems.push(`${file.name}: większe niż 15 MB`); continue }

        let blob: Blob
        let ext: string
        try {
          const r = await withTimeout(compressToWebP(file), COMPRESSION_TIMEOUT_MS, 'Kompresja trwała zbyt długo.')
          blob = r.blob
          ext = r.ext
        } catch (err) {
          console.warn('[Evently] Galeria: kompresja nieudana, próbuję oryginału:', err)
          if (!ALLOWED_ORIGINAL_TYPES.includes(file.type)) {
            problems.push(`${file.name}: nie udało się przetworzyć tego formatu (użyj JPG, PNG lub WebP)`)
            continue
          }
          blob = file
          ext = extFromType(file.type)
        }

        const fileName = `event_${crypto.randomUUID()}.${ext}`
        let up
        try {
          up = await withTimeout(
            supabase.storage.from('event-images').upload(fileName, blob, {
              upsert: false,
              contentType: blob.type || file.type,
              cacheControl: '31536000',
            }),
            UPLOAD_TIMEOUT_MS,
            'Wysyłanie trwało zbyt długo.'
          )
        } catch {
          problems.push(`${file.name}: wysyłanie trwało zbyt długo (sprawdź połączenie)`)
          continue
        }
        if (up.error) { problems.push(`${file.name}: ${up.error.message}`); continue }

        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(up.data.path)
        const next = [...current, urlData.publicUrl]
        const ok = await commit(next)
        if (!ok) { problems.push(`${file.name}: nie udało się zapisać zdjęcia w wydarzeniu`); break }
        current = next
        added++
      }
    } finally {
      setBusy(false)
      setStatus(null)
    }

    const notes: string[] = []
    if (skippedForLimit > 0) notes.push(`Pominięto ${skippedForLimit} (limit ${max} zdjęć).`)
    if (problems.length > 0) notes.push(problems.join(' · '))
    if (notes.length > 0) setError(notes.join(' '))
    if (added > 0 && problems.length === 0 && skippedForLimit === 0) setStatus(`Dodano: ${added}`)
  }

  async function remove(index: number) {
    if (locked) return
    if (!window.confirm('Usunąć to zdjęcie z galerii?')) return
    setError(null)
    setBusy(true)
    try {
      await commit(list.filter((_, i) => i !== index))
    } finally {
      setBusy(false)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (locked) return
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    setError(null)
    setBusy(true)
    try {
      await commit(next)
    } finally {
      setBusy(false)
    }
  }

  const smallBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.65)', color: 'white',
    fontSize: 14, lineHeight: 1, cursor: locked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: locked ? 0.5 : 1,
  }

  return (
    <div>
      <div style={{ fontSize: '0.8rem', color: c.muted, marginBottom: 8 }}>
        {list.length} / {max} zdjęć. Pierwsze zdjęcie pokazuje się na początku galerii.
      </div>

      {list.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
          {list.map((url, i) => (
            <div key={url} style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', background: c.thumbBg, border: `1px solid ${c.border}` }}>
              <img src={url} alt={`Zdjęcie ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>{i + 1}</span>
              <button type="button" onClick={() => remove(i)} disabled={locked} aria-label={`Usuń zdjęcie ${i + 1}`} style={{ ...smallBtn, position: 'absolute', top: 4, right: 4, background: 'rgba(185,28,28,0.9)' }}>✕</button>
              <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => move(i, -1)} disabled={locked || i === 0} aria-label={`Przesuń zdjęcie ${i + 1} wcześniej`} style={{ ...smallBtn, visibility: i === 0 ? 'hidden' : 'visible' }}>◀</button>
                <button type="button" onClick={() => move(i, 1)} disabled={locked || i === list.length - 1} aria-label={`Przesuń zdjęcie ${i + 1} później`} style={{ ...smallBtn, visibility: i === list.length - 1 ? 'hidden' : 'visible' }}>▶</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={locked || list.length >= max}
        style={{
          width: '100%', padding: '0.65rem', border: `2px dashed ${c.border}`, borderRadius: 8, background: c.bg,
          cursor: locked || list.length >= max ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: c.muted,
          opacity: locked || list.length >= max ? 0.6 : 1,
        }}
      >
        {busy ? '⏳ Przetwarzanie…' : list.length >= max ? `Limit ${max} zdjęć osiągnięty` : '📷 Dodaj zdjęcia z dysku (można kilka naraz)'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {status && <p style={{ color: '#16a34a', fontSize: '0.8rem', margin: '6px 0 0' }}>{status}</p>}
      {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}
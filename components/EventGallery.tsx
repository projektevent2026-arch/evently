'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Galeria zdjęć na stronie wydarzenia: przewijany pasek miniatur + powiększenie (lightbox).
// Używana na desktopie (EventPageClient, variant "light") i na telefonie (MobileEventDetail, variant "dark").
// Klawiatura: Esc zamyka, strzałki zmieniają zdjęcie. Na dotyku: przeciągnięcie w bok.
// "Zgłoś zdjęcie" prowadzi do formularza zgłaszania treści na /kontakt (pełna moderacja jest na liście zadań).

interface EventGalleryProps {
  urls: string[]
  title: string
  variant?: 'light' | 'dark'
}

export default function EventGallery({ urls, title, variant = 'light' }: EventGalleryProps) {
  const [open, setOpen] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  const n = Array.isArray(urls) ? urls.length : 0
  const isOpen = open !== null

  const step = useCallback((dir: -1 | 1) => {
    setOpen(cur => (cur === null ? cur : (cur + dir + n) % n))
  }, [n])

  const close = useCallback(() => setOpen(null), [])

  useEffect(() => {
    if (!isOpen) return
    lastFocus.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      lastFocus.current?.focus?.()
    }
  }, [isOpen, close, step])

  if (n === 0) return null

  const light = variant === 'light'

  const wrapStyle: React.CSSProperties = light
    ? { background: 'white', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '20px 24px' }
    : { marginTop: 20 }

  const headingStyle: React.CSSProperties = light
    ? { fontSize: 13, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }
    : { fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }

  const thumbW = light ? 168 : 132
  const thumbH = light ? 126 : 99

  const circleBtn: React.CSSProperties = {
    position: 'absolute', width: 44, height: 44, borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.16)', color: 'white', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <section aria-label="Zdjęcia z wydarzenia" style={wrapStyle}>
      <h2 style={headingStyle}>Zdjęcia ({n})</h2>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}>
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Powiększ zdjęcie ${i + 1} z ${n}`}
            style={{ flex: '0 0 auto', width: thumbW, height: thumbH, padding: 0, border: 'none', borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', background: light ? '#f3f4f6' : '#27272a', scrollSnapAlign: 'start' }}
          >
            <img src={url} alt={`${title} — zdjęcie ${i + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: light ? 12 : 10, color: light ? '#9ca3af' : '#71717a' }}>
        Zdjęcia dodane przez organizatora.{' '}
        <a href="/kontakt#zglos-tresc" rel="nofollow" style={{ color: light ? '#6b7280' : '#a1a1aa', textDecoration: 'underline' }}>Zgłoś zdjęcie</a>
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Zdjęcie ${open + 1} z ${n}`}
          onClick={close}
          onTouchStart={e => { touchX.current = e.touches[0]?.clientX ?? null }}
          onTouchEnd={e => {
            const start = touchX.current
            touchX.current = null
            if (start === null || n < 2) return
            const dx = (e.changedTouches[0]?.clientX ?? start) - start
            if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1)
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 12px 24px' }}
        >
          <img
            src={urls[open]}
            alt={`${title} — zdjęcie ${open + 1}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
          <div style={{ position: 'absolute', top: 18, left: 16, color: 'white', fontSize: 14, fontWeight: 600 }}>{open + 1} / {n}</div>
          <button ref={closeRef} type="button" onClick={e => { e.stopPropagation(); close() }} aria-label="Zamknij" style={{ ...circleBtn, top: 8, right: 12 }}>✕</button>
          {n > 1 && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Poprzednie zdjęcie" style={{ ...circleBtn, left: 8, top: '50%', transform: 'translateY(-50%)' }}>‹</button>
              <button type="button" onClick={e => { e.stopPropagation(); step(1) }} aria-label="Następne zdjęcie" style={{ ...circleBtn, right: 8, top: '50%', transform: 'translateY(-50%)' }}>›</button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
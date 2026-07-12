'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'evently_favorites'
const EVENT_NAME = 'evently:favorites-changed'

// Odczyt z localStorage (bezpieczny — SSR nie ma window).
function readFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    // Powiadom inne komponenty na TEJ SAMEJ karcie (storage event leci tylko między kartami).
    window.dispatchEvent(new Event(EVENT_NAME))
  } catch {
    // localStorage może być zablokowany (tryb prywatny) — ignorujemy cicho.
  }
}

/**
 * Ulubione wydarzenia — bez kont, na localStorage.
 * Wszystkie komponenty korzystające z tego hooka są zsynchronizowane:
 * kliknięcie serca na karcie od razu odświeża serce na detalu i licznik w nawigacji.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  // Wczytaj po zamontowaniu (nie w useState — inaczej hydration mismatch w Next).
  useEffect(() => {
    setFavorites(readFavorites())
    setLoaded(true)

    const sync = () => setFavorites(readFavorites())
    window.addEventListener(EVENT_NAME, sync)        // ta sama karta
    window.addEventListener('storage', sync)          // inne karty
    return () => {
      window.removeEventListener(EVENT_NAME, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const isFavorite = useCallback(
    (id: string | number) => favorites.includes(String(id)),
    [favorites]
  )

  const toggleFavorite = useCallback((id: string | number) => {
    const key = String(id)
    const current = readFavorites()
    const next = current.includes(key)
      ? current.filter(x => x !== key)
      : [...current, key]
    writeFavorites(next)
    setFavorites(next)
  }, [])

  return { favorites, isFavorite, toggleFavorite, loaded, count: favorites.length }
}
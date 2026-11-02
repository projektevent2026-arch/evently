// lib/getEventWithDates.ts
//
// Jedno zrodlo prawdy dla pobierania wydarzenia na stronie szczegolow po stronie PRZEGLADARKI.
// Uzywane przez OBA komponenty (MobileEventDetail, EventPageClient).
//
// 2026-11-02 (B31): sama logika pobierania przeniesiona do lib/loadEvent.ts (dziala tez na
// serwerze). Tutaj zostaje cienka nakladka dla przegladarki + licznik wyswietlen (trackView),
// ktory musi byc w przegladarce, bo korzysta z localStorage. Gdy strona dostaje wydarzenie
// z serwera (initialEvent), komponenty wolaja tylko trackView i nie pobieraja nic drugi raz.
//
// Historia (skrocona):
// - 2026-09-06: filtr deleted_at, zeby usuniete wydarzenie nie otwieralo sie z bezposredniego linka
// - 2026-09-19: widok public_events (bez organizer_email) zamiast surowej tabeli events
// - 2026-09-29: licznik wyswietlen (RPC increment_view_count), nie liczymy podgladu admina

import { supabase } from "@/lib/supabase"
import { loadEvent } from "@/lib/loadEvent"

export type { EventDateRow } from "@/lib/loadEvent"

// Licznik wyswietlen, tylko dla panelu admina. Znacznik w localStorage (24h) zapobiega zawyzaniu
// przy zwyklym odswiezeniu strony albo powrocie "wstecz" przez tego samego odwiedzajacego. To nie
// jest ochrona przed celowym naduzyciem, tylko przed najpospolitszym, niezlosliwym zawyzeniem.
// Pelna wersja (deduplikacja po IP/sesji) to osobne, swiadomie odlozone zadanie.
export function trackView(eventId: string) {
  if (typeof window === "undefined") return
  try {
    const key = `evently_viewed_${eventId}`
    const last = localStorage.getItem(key)
    const now = Date.now()
    if (!last || now - parseInt(last, 10) > 24 * 60 * 60 * 1000) {
      localStorage.setItem(key, String(now))
      supabase.rpc("increment_view_count", { p_event_id: eventId }).then(() => {})
    }
  } catch {
    // localStorage niedostepny (np. tryb prywatny): licznik nie jest krytyczny, pomijamy.
  }
}

export async function getEventWithDates(slug: string, isPreview: boolean = false) {
  const event = await loadEvent(supabase, slug, isPreview)
  if (!event) return null
  // Podgladu admina/organizatora nie liczymy jako prawdziwego wyswietlenia.
  if (!isPreview) trackView(event.id)
  return event
}
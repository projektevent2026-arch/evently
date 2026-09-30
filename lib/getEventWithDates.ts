// lib/getEventWithDates.ts
//
// Jedno źródło prawdy dla pobierania eventu + jego Terminów na stronie
// szczegółów. Używane przez OBA komponenty (MobileEventDetail,
// EventPageClient) — nie duplikować tej logiki w żadnym z nich.
//
// Design ustalony i zwalidowany z Opus + GPT (2026-08-16):
// - jeden SELECT z embedded JOIN (Supabase/PostgREST relacja przez FK),
//   nie dwa osobne zapytania — mniej round-tripów, mniej miejsc na rozjazd
// - .maybeSingle() zamiast .single() — jeśli kiedyś powstanie duplikat
//   slugu (już się zdarzało w tej bazie), .single() rzuca błędem i strona
//   się wywala; .maybeSingle() zwraca null czysto
// - terminy sortowane jawnie w JS po dacie+godzinie, nie polegamy na
//   kolejności zwróconej przez zapytanie
//
// 2026-09-06: dopisany filtr deleted_at — bez niego usunięte (soft-delete)
// wydarzenie nadal otwierało się pod swoim bezpośrednim linkiem (stary
// bookmark, wynik wyszukiwarki, udostępniony URL), mimo że zniknęło już
// z list i "Podobnych wydarzeń" po wcześniejszych poprawkach tego samego
// dnia (widok published_events_with_next_date, zapytanie w /ulubione,
// zapytanie "Podobne wydarzenia" w EventPageClient.tsx) — to czwarte i
// najważniejsze miejsce z tym samym przeoczeniem, bo to strona, na którą
// realnie ktoś kliknie.
//
// 2026-09-19: przepięte z surowej tabeli events na widok public_events
// (bez organizer_email) — anon nie ma już pełnego SELECT na events,
// tylko na wąski zestaw kolumn + na ten widok. RLS (status/deleted_at)
// nadal egzekwowane przez security_invoker na widoku, więc publishedFilter
// poniżej działa identycznie jak wcześniej.

import { publishedFilter } from "@/lib/publishedFilter"
import { supabase } from "@/lib/supabase"

export type EventDateRow = {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
}

export async function getEventWithDates(slug: string, isPreview: boolean = false) {
  const isUUID = /^[0-9a-f-]{36}$/i.test(slug)

  let query = supabase
    .from("public_events")
    .select(`
      *,
      event_dates (
        id,
        date,
        start_time,
        end_time
      )
    `)
    .eq(isUUID ? "id" : "slug", slug)

  if (!isPreview) query = publishedFilter(query)

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  // Zabezpieczenie analogiczne do tego już istniejącego w EventPageClient:
  // nawet gdyby zapytanie z jakiegoś powodu zwróciło rekord niepublikowany
  // albo usunięty mimo filtra, nie zwracamy go dalej.
  if (!isPreview && (data.status !== "published" || data.deleted_at)) return null

  const sortedDates: EventDateRow[] = [...(data.event_dates ?? [])].sort((a, b) => {
    const aVal = `${a.date}T${a.start_time ?? "00:00"}`
    const bVal = `${b.date}T${b.start_time ?? "00:00"}`
    return aVal.localeCompare(bVal)
  })

  // 2026-09-29: licznik wyświetleń, tylko dla panelu admina (patrz notatka
  // projektu) — celowo NIE liczymy podglądu admina/organizatora
  // (isPreview) jako prawdziwego wyświetlenia. Znacznik w localStorage
  // (24h) zapobiega zawyżaniu przy zwykłym odświeżeniu strony/powrocie
  // "wstecz" przez tego samego odwiedzającego — to nie jest ochrona przed
  // celowym nadużyciem (ktoś mógłby wyczyścić localStorage i wywołać RPC
  // ręcznie z konsoli), tylko przed najpospolitszym, niezłośliwym źródłem
  // zawyżenia. Pełna, dokładna wersja (deduplikacja po IP/sesji) to
  // osobne, świadomie odłożone zadanie — patrz notatka.
  if (!isPreview && typeof window !== "undefined") {
    try {
      const key = `evently_viewed_${data.id}`
      const last = localStorage.getItem(key)
      const now = Date.now()
      if (!last || now - parseInt(last, 10) > 24 * 60 * 60 * 1000) {
        localStorage.setItem(key, String(now))
        supabase.rpc("increment_view_count", { p_event_id: data.id }).then(() => {})
      }
    } catch {
      // localStorage niedostępny (np. tryb prywatny) — licznik nie jest
      // krytyczny dla działania strony, po prostu pomiń.
    }
  }

  // 2026-09-30: zdjęcie/logo i nazwa organizacji organizatora, jeśli
  // wydarzenie jest powiązane z prawdziwym kontem (created_by) i ten
  // organizator ustawił je w swoim profilu (/moje-wydarzenia/profil).
  // Osobne zapytanie do WĄSKIEGO widoku public_organizer_profiles (id,
  // organization_name, avatar_url) — NIE do surowej tabeli profiles,
  // która ma też telefon (ma zostać prywatny, patrz notatka projektu).
  // Starsze wydarzenia bez created_by (dodane anonimowo) albo
  // organizatorzy bez ustawionego profilu — po prostu pomijamy, strona
  // dalej pokazuje sam organizer_name z formularza jak dotąd.
  let organizerProfile: { organization_name: string | null; avatar_url: string | null } | null = null
  if (data.created_by) {
    const { data: profile, error: profileError } = await supabase
      .from("public_organizer_profiles")
      .select("organization_name, avatar_url")
      .eq("id", data.created_by)
      .maybeSingle()
    // TYMCZASOWY LOG — do usunięcia po znalezieniu przyczyny (2026-09-30,
    // karta Organizatora pokazuje tylko generyczny tekst zamiast
    // zdjęcia/nazwy, mimo że profil powinien je mieć ustawione).
    console.log("[ORGANIZATOR PROFILE DEBUG]", { created_by: data.created_by, profile, profileError })
    if (profile) organizerProfile = profile
  }

  return { ...data, event_dates: sortedDates, organizer_profile: organizerProfile }
}
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
    .from("events")
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

  if (!isPreview) query = query.eq("status", "published")

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  // Zabezpieczenie analogiczne do tego już istniejącego w EventPageClient:
  // nawet gdyby zapytanie z jakiegoś powodu zwróciło rekord niepublikowany
  // mimo filtra, nie zwracamy go dalej.
  if (!isPreview && data.status !== "published") return null

  const sortedDates: EventDateRow[] = [...(data.event_dates ?? [])].sort((a, b) => {
    const aVal = `${a.date}T${a.start_time ?? "00:00"}`
    const bVal = `${b.date}T${b.start_time ?? "00:00"}`
    return aVal.localeCompare(bVal)
  })

  return { ...data, event_dates: sortedDates }
}
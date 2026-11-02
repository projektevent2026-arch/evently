// lib/loadEvent.ts
//
// 2026-11-02 (B31): czesc "pobierz wydarzenie + terminy + profil organizatora" wyciagnieta z
// getEventWithDates, zeby mozna ja bylo wywolac TAKZE na serwerze (app/events/[slug]/page.tsx).
// Funkcja dostaje klienta Supabase jako argument, bo serwer ma wlasnego klienta, a przegladarka
// wlasnego. NIE dotyka localStorage ani licznika wyswietlen (to zostaje w przegladarce, patrz
// trackView w lib/getEventWithDates.ts).
//
// Zasady bez zmian wzgledem dotychczasowego getEventWithDates:
// - jeden SELECT z embedded JOIN, .maybeSingle() (duplikat slugu nie wywala strony)
// - widok public_events (bez organizer_email), publishedFilter poza podgladem
// - terminy sortowane jawnie w JS po dacie i godzinie
// - profil organizatora z WASKIEGO widoku public_organizer_profiles (nie z tabeli profiles)

import { publishedFilter } from "@/lib/publishedFilter"

export type EventDateRow = {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
}

// client: klient Supabase (przegladarkowy albo serwerowy). Typ celowo luzny, zeby nie klocil sie
// z roznymi wersjami typow supabase-js miedzy lib/supabase.ts a createClient na serwerze.
export async function loadEvent(client: any, slug: string, isPreview: boolean = false) {
  const isUUID = /^[0-9a-f-]{36}$/i.test(slug)

  let query = client
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

  // Zabezpieczenie: nawet gdyby zapytanie zwrocilo rekord niepublikowany albo usuniety mimo filtra,
  // nie zwracamy go dalej.
  if (!isPreview && (data.status !== "published" || data.deleted_at)) return null

  const sortedDates: EventDateRow[] = [...(data.event_dates ?? [])].sort((a: any, b: any) => {
    const aVal = `${a.date}T${a.start_time ?? "00:00"}`
    const bVal = `${b.date}T${b.start_time ?? "00:00"}`
    return aVal.localeCompare(bVal)
  })

  let organizerProfile: { organization_name: string | null; avatar_url: string | null } | null = null
  if (data.created_by) {
    const { data: profile } = await client
      .from("public_organizer_profiles")
      .select("organization_name, avatar_url")
      .eq("id", data.created_by)
      .maybeSingle()
    if (profile) organizerProfile = profile
  }

  return { ...data, event_dates: sortedDates, organizer_profile: organizerProfile }
}
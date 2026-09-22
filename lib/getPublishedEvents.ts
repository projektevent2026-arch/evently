import { createClient } from '@supabase/supabase-js'

// Współdzielona funkcja pobierania opublikowanych wydarzeń.
// Wydzielona 2026-09-22 przy naprawie LCP na mobile (PageSpeed: 5,1s) —
// wcześniej ta sama query siedziała tylko w app/api/events/route.ts,
// więc SSR na app/page.tsx musiałby ją duplikować (dokładnie ten wzorzec,
// który już raz narobił bugów przy promieniu wyszukiwania — trzy kopie tej
// samej logiki w trzech plikach). Jedno miejsce, dwóch konsumentów:
// - app/api/events/route.ts — klient (refetch przy zmianie filtra/lokalizacji)
// - app/page.tsx — pierwsze wczytanie po stronie serwera (SSR)
export async function getPublishedEvents(): Promise<any[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('published_events_with_next_date')
    .select('*')
    .order('next_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}
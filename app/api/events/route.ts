import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cache'owane przez Next.js na 60 sekund (jeśli next.config.ts NIE ma
// cacheComponents: true — sprawdź to; jeśli ma, ten mechanizm jest inny
// w Next 16 i trzeba by użyć 'use cache' + cacheLife() zamiast tego).
// Nagłówek Cache-Control poniżej działa niezależnie od tego, który model
// jest aktywny — to on realnie robi robotę dla requestów z przeglądarki.
export const revalidate = 60

export async function GET() {
  // Osobna instancja klienta per request — nie reużywamy singletona
  // z lib/supabase.ts (ten jest dla przeglądarki, tu jesteśmy na serwerze
  // obsługującym wielu użytkowników naraz).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .order('start_date', { ascending: true })

  if (error) {
    // NIGDY nie cache'uj błędu — inaczej jedna awaria Supabase daje
    // wszystkim użytkownikom błąd przez całe okno rewalidacji.
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(data ?? [], {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  })
}
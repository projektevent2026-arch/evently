import { NextResponse } from 'next/server'
import { getPublishedEvents } from '@/lib/getPublishedEvents'

// Cache'owane przez Next.js na 60 sekund (jeśli next.config.ts NIE ma
// cacheComponents: true — sprawdź to; jeśli ma, ten mechanizm jest inny
// w Next 16 i trzeba by użyć 'use cache' + cacheLife() zamiast tego).
// Nagłówek Cache-Control poniżej działa niezależnie od tego, który model
// jest aktywny — to on realnie robi robotę dla requestów z przeglądarki.
export const revalidate = 60

// 2026-09-22: query wydzielona do lib/getPublishedEvents.ts, żeby SSR na
// app/page.tsx mógł jej użyć bez duplikowania (patrz komentarz w tamtym
// pliku). Ten endpoint zostaje — obsługuje refetch przy zmianie filtra/
// lokalizacji z poziomu przeglądarki (EventsGrid, MobileHome).
export async function GET() {
  try {
    const data = await getPublishedEvents()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: any) {
    // NIGDY nie cache'uj błędu — inaczej jedna awaria Supabase daje
    // wszystkim użytkownikom błąd przez całe okno rewalidacji.
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
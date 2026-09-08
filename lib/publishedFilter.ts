// lib/publishedFilter.ts
//
// Filtr "opublikowane i nie usunięte" — jedno wywołanie zamiast dwóch
// osobnych warunków (.eq("status","published") + .is("deleted_at", null))
// do zapamiętania w każdym miejscu, które pyta tabelę `events` bezpośrednio.
//
// 2026-09-06: brak DRUGIEGO z tych warunków (deleted_at) został znaleziony
// niezależnie w 4 różnych miejscach w jednej sesji — widok
// published_events_with_next_date (SQL, naprawiony osobno w bazie), zapytanie
// w /ulubione, "Podobne wydarzenia" w EventPageClient.tsx, getEventWithDates.ts.
// Ta funkcja nie eliminuje ryzyka pomyłki całkowicie (trzeba nadal PAMIĘTAĆ,
// żeby jej użyć przy nowym zapytaniu do `events`) — ale sprowadza pomyłkę
// do "zapomniałem wywołać jedną funkcję" zamiast "zapomniałem jeden z dwóch
// warunków w środku długiego łańcucha .eq().is().neq().limit()", co jest
// dużo łatwiejsze zauważyć przy review kodu.
//
// UWAGA: to NIE zastępuje widoku published_events_with_next_date (ta ścieżka
// dla list idzie przez /api/events, już scentralizowane) — to tylko dla
// miejsc, które pytają tabelę `events` BEZPOŚREDNIO poza tym widokiem.
export function publishedFilter(query: any) {
    return query.eq("status", "published").is("deleted_at", null)
  }
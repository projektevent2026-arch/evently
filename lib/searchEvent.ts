/**
 * Wyszukiwanie po treści wydarzenia.
 * Odporne na wielkość liter i brak polskich znaków ("przerosliaki" znajdzie "PRZEROŚLIAKI").
 * Przeszukuje też program (schedule) — stąd działają nazwiska artystów.
 */

/** "PRZEROŚLIAKI" -> "przerosliaki" */
export function normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }
  
  type SearchableEvent = {
    title?: string | null
    city?: string | null
    description?: string | null
    short_description?: string | null
    venue_name?: string | null
    organizer_name?: string | null
    address?: string | null
    category?: string | null
    schedule?: unknown
  }
  
  /** Czy wydarzenie pasuje do zapytania. Puste zapytanie = pasuje wszystko. */
  export function matchesQuery(event: SearchableEvent, query: string): boolean {
    const q = normalize(query.trim())
    if (!q) return true
  
    const parts: string[] = [
      event.title ?? '',
      event.city ?? '',
      event.description ?? '',
      event.short_description ?? '',
      event.venue_name ?? '',
      event.organizer_name ?? '',
      event.address ?? '',
      event.category ?? '',
    ]
  
    // Program: nazwy punktów i opisy (artyści, zespoły).
    if (event.schedule) {
      try {
        parts.push(JSON.stringify(event.schedule))
      } catch {}
    }
  
    const haystack = normalize(parts.join(' '))
  
    // Każde słowo z zapytania musi wystąpić — "kapela suwalki" zadziała.
    return q.split(/\s+/).every((word) => haystack.includes(word))
  }
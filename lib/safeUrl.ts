// Ticket_url i website_url pochodzą z formularza (w tym publicznego,
// anonimowego) i lądują wprost w <a href={...}> na stronie wydarzenia.
// Bez tej kontroli ktoś mógłby wpisać "javascript:alert(1)" zamiast
// prawdziwego linku — kliknięcie wykonałoby ten kod w przeglądarce
// odwiedzającego zamiast nawigacji. Kolejka moderacji dla zgłoszeń
// publicznych to dodatkowa warstwa, ale nie powód żeby nie odciąć tego
// też u źródła, przy samym zapisie.
//
// 2026-09-20
export function safeUrl(value: string | null | undefined): string | null {
    const trimmed = (value || "").trim()
    if (!trimmed) return null
    if (!/^https?:\/\//i.test(trimmed)) return null
    return trimmed
  }
// Jedno miejsce, które zamienia cenę z bazy (events.price_from) na tekst.
//
// Pole w bazie nazywa się price_from z historycznych powodów, ale od B12
// traktujemy je jako JEDNĄ cenę biletu — bez słowa "Od". Dopóki nie ma osobnego
// pola na widełki / opis ceny, "Od" było zgadywaniem: organizator wpisywał
// zwykłą cenę, a odwiedzający czytał "Od 330 PLN".
//
// Zwraca null, gdy ceny nie ma albo to 0 (płatne wydarzenie z ceną 0 nie może
// pokazywać "0 zł" — wołający pokazuje wtedy samo "Płatne").
export function formatPrice(value: number | string | null | undefined): string | null {
    if (value === null || value === undefined || value === "") return null
    const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."))
    if (!Number.isFinite(n) || n <= 0) return null
    const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")
    return `${text} zł`
  }
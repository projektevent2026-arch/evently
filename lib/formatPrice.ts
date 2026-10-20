// Jedno miejsce, które zamienia cenę z bazy (events.price_from + price_currency)
// na tekst.
//
// Pole w bazie nazywa się price_from z historycznych powodów, ale od B12
// traktujemy je jako JEDNĄ cenę biletu — bez słowa "Od". Widełki i dopiski
// ("dzieci do lat 12 za darmo") organizator wpisuje w osobnym polu price_note.
//
// Waluta: tylko PLN (domyślnie) i EUR. Każda inna wartość z bazy jest traktowana
// jak PLN, żeby śmieci w danych nie wyświetliły dziwnego symbolu.
//
// Zwraca null, gdy ceny nie ma albo to 0 (płatne wydarzenie z ceną 0 nie może
// pokazywać "0 zł" — wołający pokazuje wtedy samo "Płatne").
export type PriceCurrency = "PLN" | "EUR"

export function formatPrice(
  value: number | string | null | undefined,
  currency?: string | null
): string | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."))
  if (!Number.isFinite(n) || n <= 0) return null
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")
  return currency === "EUR" ? `${text} €` : `${text} zł`
}

// Krótki dopisek pod ceną (price_note). Pusty -> null.
export function cleanPriceNote(value: string | null | undefined): string | null {
  const t = (value || "").replace(/\s+/g, " ").trim().slice(0, 80)
  return t || null
}
// 2026-10-19: numer telefonu do rezerwacji (events.reservation_phone).
// Numer jest wpisywany przez człowieka i trafia wprost do <a href="tel:...">,
// więc — tak samo jak przy safeUrl — czyścimy go przy zapisie ORAZ przy wyświetlaniu.
// Reguła jest ta sama, co CHECK w bazie (events_reservation_phone_format):
//   ^[+(]?[0-9][0-9 ()-]{4,18}[0-9]$   czyli 6–21 znaków: cyfry, spacje, nawiasy, myślniki,
//   na początku opcjonalny + lub nawias, na początku i końcu cyfra.
// Zwraca numer ze zwiniętymi spacjami albo null, gdy numer jest pusty lub zły.
const TEL_PATTERN = /^[+(]?[0-9][0-9 ()-]{4,18}[0-9]$/

export function safeTel(value: string | null | undefined): string | null {
  const cleaned = (value || "").replace(/\s+/g, " ").trim()
  if (!cleaned) return null
  return TEL_PATTERN.test(cleaned) ? cleaned : null
}

// Do href="tel:...": tylko cyfry i ewentualny + na początku (bez spacji i nawiasów).
export function telHref(value: string | null | undefined): string | null {
  const ok = safeTel(value)
  if (!ok) return null
  const digits = ok.replace(/[^\d]/g, "")
  if (!digits) return null
  return "tel:" + (ok.startsWith("+") ? "+" : "") + digits
}
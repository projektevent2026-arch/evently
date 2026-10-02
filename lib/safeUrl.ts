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

// 2026-10-02: linki w publicznym profilu organizatora (strona www,
// Facebook, Instagram). Dwie warstwy, bo kolumny w profiles organizator
// może zapisać bezpośrednio przez API z pominięciem formularza:
//  1) ta funkcja — normalizuje to, co wpisał człowiek ("www.firma.pl" bez
//     "https://" też przejdzie), odrzuca obce schematy (javascript:, data:),
//     adresy z loginem (https://facebook.com@obca.pl) i obce domeny dla
//     ikon społecznościowych; używana przy zapisie ORAZ przy wyświetlaniu,
//  2) ograniczenia CHECK w bazie (migracja 0002) — ten sam wzorzec https
//     i te same domeny, jako ostatnia linia obrony.
// Zwraca znormalizowany adres z https:// albo null, gdy adres jest zły.
export type ProfileLinkKind = "website" | "facebook" | "instagram"

const SOCIAL_HOST: Record<"facebook" | "instagram", RegExp> = {
  facebook: /^(www\.|m\.)?(facebook\.com|fb\.com)$/i,
  instagram: /^(www\.)?instagram\.com$/i,
}

export function safeProfileUrl(
  value: string | null | undefined,
  kind: ProfileLinkKind
): string | null {
  const trimmed = (value || "").trim()
  if (!trimmed || trimmed.length > 200) return null

  const hasHttp = /^https?:\/\//i.test(trimmed)
  // Jakikolwiek inny schemat (javascript:, data:, ftp:) odrzucamy zamiast
  // go "naprawiać" przez doklejenie https://.
  if (!hasHttp && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null

  let url: URL
  try {
    url = new URL(hasHttp ? trimmed : "https://" + trimmed)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  if (url.username || url.password) return null
  url.protocol = "https:"

  if (kind === "website") {
    if (!url.hostname.includes(".")) return null
  } else {
    // Sam adres domeny (facebook.com/) nie jest linkiem do profilu.
    if (!SOCIAL_HOST[kind].test(url.hostname) || url.pathname.length <= 1) return null
  }

  const result = url.toString()
  return result.length <= 200 ? result : null
}

// "https://www.firma.pl/" -> "www.firma.pl" (do wyświetlania obok linku)
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
}
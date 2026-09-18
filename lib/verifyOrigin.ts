// lib/verifyOrigin.ts
//
// Sprawdza, czy zapytanie do API przyszło z własnej domeny apki, nie z
// zewnątrz (np. skryptu bijącego bezpośrednio w adres endpointu, z
// pominięciem całej reszty apki). To NIE jest twierdza nie do złamania —
// nagłówki Origin/Referer da się podrobić w spreparowanym zapytaniu — ale
// odcina niemal całe przypadkowe i zautomatyzowane nadużywanie, przy
// zerowym koszcie dla prawdziwych użytkowników (przeglądarka wysyła te
// nagłówki sama, nikt tego nie zauważy).
//
// 2026-09-08: dodane po przeglądzie bezpieczeństwa — /api/scan-poster i
// /api/improve-description kosztują realne pieniądze (wywołanie Anthropic
// API) za KAŻDE zapytanie, a middleware.ts chroni tylko strony (/admin,
// /dodaj-wydarzenie), NIE ścieżki /api/*. Ktokolwiek znający adres mógł
// wywoływać je bezpośrednio, bez limitu. /api/geocode i
// /api/scan-poster/geocode nie kosztują pieniędzy, ale przy nadużyciu
// ryzykują banem od Nominatim dla całej apki.
//
// Dopisz tu kolejne domeny, gdy dojdzie własna (myevently.pl) — nic więcej
// nie trzeba zmieniać w żadnym z czterech plików, które z tego korzystają.
const ALLOWED_HOSTS = [
  "evently-silk-omega.vercel.app",
  "localhost:3000",
  "myevently.pl",
  "www.myevently.pl",
]

export function isAllowedOrigin(req: Request): boolean {
  const raw = req.headers.get("origin") || req.headers.get("referer") || ""
  if (!raw) return false

  // .includes() przepuszczało np. "evently-silk-omega.vercel.app.evil.com"
  // (nasza domena jako PODCIĄG cudzej) — new URL(...).host wyciąga
  // WYŁĄCZNIE prawdziwy host z adresu, więc takie oszustwo już nie przejdzie.
  let host: string
  try {
    host = new URL(raw).host
  } catch {
    return false
  }

  return ALLOWED_HOSTS.includes(host)
}
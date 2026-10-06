// 2026-10-02: jedno miejsce na dane administratora serwisu. Używane przez
// regulamin, politykę prywatności i stopkę, żeby nie rozsiewać tych danych
// po kilku plikach i niczego nie zostawić pustego.
//
// WPISZ TRZY WARTOŚCI PONIŻEJ (cudzysłowy zostają):
//  - ADMIN_NAME  — imię i nazwisko, tak jak mają stać w regulaminie,
//  - ADMIN_EMAIL — adres e-mail do kontaktu (osobny, tylko do projektu;
//                  jest publiczny i jest punktem kontaktowym wymaganym
//                  przez DSA, więc musi być skrzynką, którą czytasz),
//  - SITE_URL    — adres serwisu, np. "https://twojadomena.pl".
//
// Dopóki któraś jest pusta, `next build` (czyli Vercel) CELOWO przerywa
// budowanie z komunikatem poniżej — dzięki temu pusta wartość nie trafi
// na produkcję. Poprzednia wersja strony zostaje wtedy włączona bez zmian.
// W trybie `npm run dev` strony pokazują wtedy "[UZUPEŁNIJ: ...]".
// TYMCZASOWE (stan na 2026-10-06): adres Gmail i adres vercel.app. Gdy będzie własna domena i poczta,
// zmień ADMIN_EMAIL i SITE_URL poniżej, zaktualizuj LEGAL_UPDATED i wypchnij zmianę. Stary adres zostaw
// na przekierowaniu na kilka miesięcy. Przy założeniu firmy zmień też ADMIN_NAME i dopisz adres firmy
// (regulamin, polityka prywatności).
export const SITE_NAME = "Evently"
export const ADMIN_NAME = "Rafał Ziemiacki"
export const ADMIN_EMAIL = "projektevent2026@gmail.com"
export const SITE_URL = "https://evently-silk-omega.vercel.app"

// Data ostatniej aktualizacji regulaminu i polityki prywatności.
export const LEGAL_UPDATED = "6 października 2026"

const missing: string[] = []
if (!ADMIN_NAME.trim()) missing.push("ADMIN_NAME")
if (!ADMIN_EMAIL.trim()) missing.push("ADMIN_EMAIL")
if (!SITE_URL.trim()) missing.push("SITE_URL")

if (missing.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(
    `lib/siteConfig.ts: uzupełnij ${missing.join(", ")} — dane administratora są wymagane w regulaminie, polityce prywatności i stopce.`
  )
}

// Wartość albo czytelny znacznik w trybie dev.
export function field(value: string, label: string): string {
  return value.trim() || `[UZUPEŁNIJ: ${label} w lib/siteConfig.ts]`
}
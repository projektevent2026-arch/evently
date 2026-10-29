// Lista krajów dostępnych w formularzach wydarzeń (publicznym i adminie).
// Jedno miejsce prawdy: kod ISO 3166-1 alfa-2 zapisywany w events.country_code
// i ten sam kod wysyłany do geokodera (/api/geocode?country=...).
// Dodanie kraju = jedna linijka tutaj.
export const COUNTRIES = [
    { code: "PL", name: "Polska" },
    { code: "DE", name: "Niemcy" },
    { code: "FR", name: "Francja" },
    { code: "LT", name: "Litwa" },
  ] as const
  
  export const DEFAULT_COUNTRY: string = "PL"
  
  // Kod spoza listy (np. "BE" zapisane wcześniej w bazie albo wykryte na plakacie)
  // nie może zniknąć z listy rozwijanej — inaczej zapis po cichu zmieniłby kraj.
  export function countryOptions(current: string): { code: string; name: string }[] {
    const list: { code: string; name: string }[] = COUNTRIES.map(c => ({ code: c.code, name: c.name }))
    const cur = (current || "").toUpperCase()
    if (cur && !list.some(c => c.code === cur)) list.push({ code: cur, name: cur })
    return list
  }
  
  export function normalizeCountry(value: unknown): string {
    const v = typeof value === "string" ? value.trim().toUpperCase() : ""
    return /^[A-Z]{2}$/.test(v) ? v : DEFAULT_COUNTRY
  }
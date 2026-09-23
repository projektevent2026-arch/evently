// Geokodowanie z fallbackiem na samo miasto, plus sugestia miasta z
// przynależności administracyjnej (gminy) — do przeglądu przez
// użytkownika, NIGDY jako ciche, automatyczne uzupełnienie.
//
// 2026-09-23: Nominatim (OpenStreetMap) często nie ma adresu na poziomie
// KONKRETNEGO NUMERU DOMU dla małych miejscowości ("Tauroszyszki 10" —
// nic), ale samą miejscowość zna ("Tauroszyszki" — tak). Bez tego
// fallbacku formularz milczał (przycisk "Znajdź" kończył się bez efektu).
// Wydzielone do lib/, bo dokładnie ta sama logika (adres+miasto -> fetch
// /api/geocode) była powielona w DWÓCH formularzach (publiczny
// dodaj-wydarzenie i panel admina) — ten sam wzorzec powielenia, który
// już raz narobił bugów przy promieniu wyszukiwania gdzie indziej w tej
// apce. Trzecia kopia tego samego kodu nie powstaje.
//
// suggestedCity: dla wsi w gminie, Nominatim zwraca m.in.
// address.municipality jako "Gmina X" — zdjęty prefiks daje nazwę miasta
// będącego siedzibą gminy. TO JEST PRZYNALEŻNOŚĆ ADMINISTRACYJNA, nie
// "najbliższe/najbardziej sensowne miasto" — te dwie rzeczy czasem się
// pokrywają (sprawdzone: Tauroszyszki -> Gmina Puńsk -> "Puńsk" było
// trafne), ale nie muszą. Dlatego to tylko PODPOWIEDŹ do zatwierdzenia
// przez człowieka (w tym miejscu w kodzie działa to w ramach istniejącego
// banera "AI wypełniło formularz — sprawdź i popraw", nie jako
// samodzielne, niezależne auto-uzupełnienie) — nigdy nie ufaj jej bez
// przeglądu, zwłaszcza gdy Miasto to pole wymagane używane do filtrowania.
function extractSuggestedCity(address: Record<string, string> | undefined): string | null {
    if (!address) return null
    if (address.city) return address.city
    if (address.town) return address.town
    if (address.municipality) return address.municipality.replace(/^gmina\s+/i, "").trim()
    return null
  }
  
  export async function geocodeAddress(
    address: string,
    city: string
  ): Promise<{ lat: string; lon: string; suggestedCity: string | null } | null> {
    const full = [address, city].filter(Boolean).join(", ")
    if (!full) return null
  
    const tryQuery = async (q: string) => {
      const res = await fetch("/api/geocode?q=" + encodeURIComponent(q))
      const data = await res.json()
      return Array.isArray(data) && data[0] ? data[0] : null
    }
  
    const withSuggestion = (result: any) => ({
      lat: result.lat,
      lon: result.lon,
      suggestedCity: extractSuggestedCity(result.address),
    })
  
    const first = await tryQuery(full)
    if (first) return withSuggestion(first)
  
    if (city && city !== full) {
      const second = await tryQuery(city)
      if (second) return withSuggestion(second)
    }
  
    return null
  }
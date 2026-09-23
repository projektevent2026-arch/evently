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
//
// 2026-09-23: Nominatim czasem duplikuje nazwę samej wsi na kilku
// poziomach naraz (np. address.city = "Tauroszyszki", to samo co
// address.village) — bez pomijania takich duplikatów pierwszy sprawdzany
// klucz (city) zwracał z powrotem nazwę wsi, którą i tak już mieliśmy,
// i podpowiedź nigdy nie docierała do właściwej gminy. knownVillage
// pozwala pominąć kandydatów, które tylko powtarzają to, co już wiemy.
function extractSuggestedCity(
    address: Record<string, string> | undefined,
    knownVillage: string
  ): string | null {
    if (!address) return null
    const candidates = [
      address.city,
      address.town,
      address.municipality?.replace(/^gmina\s+/i, "").trim(),
    ].filter(Boolean) as string[]
  
    for (const c of candidates) {
      if (c.toLowerCase() !== knownVillage.trim().toLowerCase()) return c
    }
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
      // 2026-09-23: brakowało sprawdzenia statusu — gdy serwer odrzucał
      // zapytanie (limit 30/h, błąd Nominatim, cokolwiek), odpowiedź to
      // {error: "..."}, nie tablica. Array.isArray() na tym zwracało false,
      // funkcja cicho zwracała null, i formularz wyglądał tak, jakby nic
      // nie znaleziono — bez śladu prawdziwej przyczyny. Teraz taki
      // przypadek leci jako wyjątek z czytelnym komunikatem, zamiast ciszy.
      if (res.status === 429) {
        throw new Error("Zbyt wiele wyszukiwań lokalizacji w krótkim czasie — odczekaj kilka minut i spróbuj ponownie.")
      }
      if (!res.ok) {
        throw new Error("Nie udało się połączyć z usługą wyszukiwania lokalizacji. Spróbuj ponownie za chwilę.")
      }
      const data = await res.json()
      return Array.isArray(data) && data[0] ? data[0] : null
    }
  
    const withSuggestion = (result: any) => ({
      lat: result.lat,
      lon: result.lon,
      suggestedCity: extractSuggestedCity(result.address, city || address),
    })
  
    const first = await tryQuery(full)
    if (first) return withSuggestion(first)
  
    if (city && city !== full) {
      const second = await tryQuery(city)
      if (second) return withSuggestion(second)
    }
  
    return null
  }
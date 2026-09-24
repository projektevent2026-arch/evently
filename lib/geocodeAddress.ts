// Geokodowanie z fallbackiem na samo miasto, plus sugestia miasta z
// przynależności administracyjnej (gminy).
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
// trafne), ale nie muszą. UWAGA na kontrakt tej wartości: przy ręcznym
// "Znajdź" w obu formularzach (patrz handleGeocode w dodaj-wydarzenie/
// page.tsx i AdminWydarzenie.tsx) suggestedCity JEST wpisywane wprost do
// pola Miasto — automatycznie, nie jako podpowiedź do zatwierdzenia — ale
// TYLKO gdy dotychczasowe Miasto wygląda na przypadkowe (puste albo
// powtórzone z adresu); jeśli w Mieście jest coś innego, świadomie
// wpisanego, zostaje nietknięte. To był świadomy wybór (2026-09-23, na
// wyraźną prośbę), nie domyślne zachowanie tej funkcji samej w sobie —
// jeśli używasz suggestedCity gdzie indziej, nie zakładaj automatycznego
// nadpisania bez sprawdzenia tamtego wywołania.
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
  
    // Nominatim czasem duplikuje nazwę samej wsi na kilku poziomach naraz
    // (np. address.city = "Tauroszyszki", to samo co address.village) —
    // pomijamy takich kandydatów, żeby nie "sugerować" nazwy, którą i tak
    // już mamy.
    for (const c of candidates) {
      if (c.toLowerCase() !== knownVillage.trim().toLowerCase()) return c
    }
    return null
  }
  
  export async function geocodeAddress(
    address: string,
    city: string
  ): Promise<{ lat: string; lon: string; suggestedCity: string | null } | null> {
    // 2026-09-23: gdy miasto jest już zawarte w adresie (np. Miasto
    // "Tauroszyszki", Adres "Tauroszyszki 10" — częste dla małych wsi, gdzie
    // nie ma osobnej ulicy), NIE doklejamy go po przecinku. Nominatim czyta
    // przecinki w zapytaniu jako hierarchię "X wewnątrz obszaru Y" — więc
    // "Tauroszyszki 10, Tauroszyszki" każe mu szukać Tauroszyszek wewnątrz
    // Tauroszyszek, co zbija dopasowanie i dawało 0 wyników. Sam adres, bez
    // powtórzenia, trafia od razu. Gdy miasto jest czymś INNYM niż to, co
    // już jest w adresie (typowy przypadek: "ul. Kościuszki 5" + "Suwałki"),
    // dalej je doklejamy — tam miasto faktycznie doprecyzowuje, nie duplikuje.
    const cityIsRedundant = !!city.trim() && !!address.trim() && address.toLowerCase().includes(city.trim().toLowerCase())
    const full = cityIsRedundant ? address : [address, city].filter(Boolean).join(", ")
    if (!full) return null
  
    // Realna polityka Nominatim to max ~1 zapytanie/s. Gdy pierwsza próba
    // (full) nie trafi i trzeba iść dalej w łańcuch fallbacków, kolejne
    // zapytania potrzebują odstępu — bez niego czasem wracały puste, mimo
    // że dane istniały, bo przyszły za szybko.
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  
    const tryQuery = async (q: string) => {
      const res = await fetch("/api/geocode?q=" + encodeURIComponent(q))
      // Brakowało sprawdzenia statusu — gdy serwer odrzucał zapytanie (limit
      // 30/h, błąd Nominatim, cokolwiek), odpowiedź to {error: "..."}, nie
      // tablica. Taki przypadek leci teraz jako wyjątek z czytelnym
      // komunikatem, zamiast cichego "nic nie znaleziono".
      if (res.status === 429) {
        throw new Error("Zbyt wiele wyszukiwań lokalizacji w krótkim czasie — odczekaj kilka minut i spróbuj ponownie.")
      }
      if (!res.ok) {
        throw new Error("Nie udało się połączyć z usługą wyszukiwania lokalizacji. Spróbuj ponownie za chwilę.")
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        // 200 OK, ale treść to np. {error:"..."} — backendowy problem, nie
        // "brak wyników". Te dwie sytuacje są różne i nie powinny wyglądać
        // tak samo dla użytkownika.
        throw new Error("Usługa wyszukiwania lokalizacji zwróciła nieoczekiwaną odpowiedź.")
      }
      return data[0] ?? null
    }
  
    const withSuggestion = (result: any) => ({
      lat: result.lat,
      lon: result.lon,
      suggestedCity: extractSuggestedCity(result.address, city || address),
    })
  
    const first = await tryQuery(full)
    if (first) return withSuggestion(first)
  
    // Poniższy łańcuch to siatka bezpieczeństwa na wypadek, gdyby powyższe
    // (deduplikowane) zapytanie i tak nic nie znalazło — rzadsze niż wcześniej,
    // ale wciąż możliwe (np. Nominatim nie ma w ogóle tej miejscowości pod
    // taką pisownią). Nieużywane, gdy first powyżej już trafił.
    if (!cityIsRedundant && address && address !== full) {
      await sleep(1100)
      const direct = await tryQuery(address)
      if (direct) return withSuggestion(direct)
    }
  
    if (city && city !== full) {
      await sleep(1100)
      const second = await tryQuery(city)
      if (second) {
        const suggestion = withSuggestion(second)
        // Zapytanie samą wsią zwraca tylko środek CAŁEJ wsi (granica
        // administracyjna), nie konkretny adres — mniej precyzyjne niż
        // pełne zapytanie z numerem domu. Skoro już wiemy, jakie miasto
        // Nominatim uznaje za właściwe (suggestedCity), spróbuj RAZ JESZCZE
        // pełnym adresem, ale z tym miastem zamiast oryginalnego.
        if (suggestion.suggestedCity && suggestion.suggestedCity !== city) {
          await sleep(1100)
          const betterFull = [address, suggestion.suggestedCity].filter(Boolean).join(", ")
          const better = await tryQuery(betterFull)
          if (better) {
            return { lat: better.lat, lon: better.lon, suggestedCity: suggestion.suggestedCity }
          }
        }
        return suggestion
      }
    }
  
    return null
  }
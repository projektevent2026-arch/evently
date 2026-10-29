import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/verifyOrigin'
import { geocodeRateLimit, getClientIp } from '@/lib/rateLimit'

const NOMINATIM_HEADERS = {
  'User-Agent': 'Evently/1.0 (projektevent2026@gmail.com)',
  'Accept-Language': 'pl',
}

/** Usuwa polskie przedrostki adresowe, których Nominatim nie trawi. */
function stripPrefixes(input: string): string {
  let s = input.trim()
  // wielokrotnie, bo zdarza się "ul. al. Piłsudskiego"
  const pattern = /^(ul\.?|ulica|al\.?|aleja|aleje|pl\.?|plac|os\.?|osiedle|rondo|skwer)\s+/i
  while (pattern.test(s)) {
    s = s.replace(pattern, '').trim()
  }
  return s
}

/** "53.92,23.20" | "53.92 23.20" | "53,92 23,20" -> punkt. Null gdy to nie współrzędne. */
function parseCoords(input: string): { lat: number; lon: number } | null {
  const s = input.trim()

  // Wariant z przecinkiem jako separatorem par: "53.92, 23.20"
  let m = s.match(/^(-?\d{1,3}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)$/)
  // Wariant ze spacją: "53.92 23.20"
  if (!m) m = s.match(/^(-?\d{1,3}\.\d+)\s+(-?\d{1,3}\.\d+)$/)
  // Wariant z przecinkiem dziesiętnym i spacją: "53,92 23,20"
  if (!m) {
    const alt = s.match(/^(-?\d{1,3},\d+)\s+(-?\d{1,3},\d+)$/)
    if (alt) m = [alt[0], alt[1].replace(',', '.'), alt[2].replace(',', '.')] as RegExpMatchArray
  }

  if (!m) return null

  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  // Walidacja: tylko poprawny zakres geograficzny. Wcześniej było tu "Polska
  // mniej więcej lat 49-55, lon 14-24", przez co współrzędne wydarzenia za
  // granicą (np. Antwerpia 51.2, 4.4) były odrzucane i lądowały w Nominatimie
  // jako zwykły tekst.
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null

  return { lat, lon }
}

// Trzy zakresy wyszukiwania, od najbardziej lokalnego:
//  - region: twardo ograniczone do okolic Suwałk (jak dotąd),
//  - poland: cała Polska, bez ograniczenia do regionu,
//  - world:  cały świat (wydarzenia za granicą, np. Antwerpia).
// Polska ZAWSZE ma pierwszeństwo: świat jest pytany dopiero, gdy region i Polska
// nic nie dały. Dzięki temu literówka w polskiej wsi nie wyląduje w innym kraju.
//  - country: konkretny kraj wybrany przez użytkownika w formularzu (parametr
//    ?country=DE). Wtedy szukamy WYŁĄCZNIE w tym kraju, bez cofania się na
//    cały świat — inaczej "Dillingen" wpisane przy Niemczech mogło wylądować
//    w złym kraju.
type Scope = 'region' | 'poland' | 'world' | 'country'

async function askNominatim(query: string, scope: Scope, countryCode?: string) {
  // viewbox + bounded=1 = TWARDE ograniczenie do regionu Suwałk (2026-09-23:
  // zmienione z miękkiego nachylenia na twardy filtr — na rekomendację z
  // sesji debugowania Tauroszyszki/Pułsk). Pudełko z zapasem ~80km od Suwałk
  // (54.1113, 22.9302) w każdą stronę, żeby objąć sąsiednie powiaty (Sejny,
  // Augustów, Ełk). Format: lewo,góra,prawo,dół (lon_min,lat_max,lon_max,lat_min).
  const SUWALKI_VIEWBOX = "21.70,54.83,24.16,53.39"
  const scopeParams =
    scope === 'region'
      ? `&countrycodes=pl&viewbox=${SUWALKI_VIEWBOX}&bounded=1`
      : scope === 'poland'
        ? '&countrycodes=pl'
        : scope === 'country' && countryCode
          ? `&countrycodes=${countryCode}`
          : ''
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5&addressdetails=1${scopeParams}`

  const res = await fetch(url, {
    headers: NOMINATIM_HEADERS,
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[geocode] Nominatim ${res.status} (${scope}):`, body)
    return { ok: false as const, status: res.status }
  }

  const data = await res.json()
  return { ok: true as const, data }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await geocodeRateLimit.limit(getClientIp(req))
  if (!success) {
    return NextResponse.json({ error: 'Zbyt wiele zapytań. Spróbuj za kilka minut.' }, { status: 429 })
  }

  const query = req.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  const raw = query.trim()

  // Opcjonalny kraj z formularza (kod ISO, np. DE). Nieprawidłowa wartość jest
  // ignorowana (zachowanie jak dotąd: region -> Polska -> świat). Brak parametru
  // = stare wywołania (skan plakatu itp.) działają bez zmian.
  const countryRaw = (req.nextUrl.searchParams.get('country') || '').trim().toLowerCase()
  const countryCode = /^[a-z]{2}$/.test(countryRaw) ? countryRaw : null

  // 1. Współrzędne wpisane wprost — nie pytamy Nominatima.
  const coords = parseCoords(raw)
  if (coords) {
    return NextResponse.json([
      {
        lat: String(coords.lat),
        lon: String(coords.lon),
        display_name: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
        type: 'manual_coords',
      },
    ])
  }

  try {
    const cleaned = stripPrefixes(raw)
    const cleanedDiffers = !!cleaned && cleaned.toLowerCase() !== raw.toLowerCase() && cleaned.length >= 2

    // 2. Od najbardziej lokalnego zakresu do najszerszego. W każdym zakresie
    // najpierw oryginalne zapytanie, potem (jeśli się różni) bez przedrostka
    // ("ul. Chłodna 2" -> "Chłodna 2"). Przedrostki są polskie, więc dla
    // zakresu "world" już ich nie obcinamy.
    // Między kolejnymi pytaniami przerwa ~1 s (limit Nominatim: 1 zapytanie/s).
    // Gdy pierwsze zapytanie trafi, odpowiedź wraca od razu, bez czekania.
    // Kraj wybrany wprost: Polska = region -> Polska (bez świata), inny kraj =
    // tylko ten kraj. Bez wyboru: region -> Polska -> świat jak wcześniej.
    const scopes: Scope[] =
      countryCode === 'pl' ? ['region', 'poland']
      : countryCode ? ['country']
      : ['region', 'poland', 'world']
    let firstCall = true
    for (const scope of scopes) {
      const queries = (scope === 'region' || scope === 'poland') && cleanedDiffers ? [raw, cleaned] : [raw]
      for (const q of queries) {
        if (!firstCall) await sleep(1000)
        firstCall = false
        const result = await askNominatim(q, scope, countryCode ?? undefined)
        if (!result.ok) {
          // Pierwsza odpowiedź z błędem = problem po stronie Nominatima, nie "brak wyników".
          return NextResponse.json({ error: `Nominatim: ${result.status}` }, { status: 502 })
        }
        if (Array.isArray(result.data) && result.data.length > 0) {
          return NextResponse.json(result.data)
        }
      }
    }

    return NextResponse.json([])
  } catch (err) {
    console.error('[geocode] Fetch failed:', err)
    return NextResponse.json({ error: 'Nie można połączyć z serwisem geocodingu' }, { status: 500 })
  }
}
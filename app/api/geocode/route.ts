import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM_HEADERS = {
  'User-Agent': 'Evently/1.0 (kontakt@evently.pl)',
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

  // Walidacja: Polska mniej więcej lat 49-55, lon 14-24.
  if (lat < 49 || lat > 55 || lon < 14 || lon > 24) return null

  return { lat, lon }
}

async function askNominatim(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5&countrycodes=pl&addressdetails=1`

  const res = await fetch(url, {
    headers: NOMINATIM_HEADERS,
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[geocode] Nominatim ${res.status}:`, body)
    return { ok: false as const, status: res.status }
  }

  const data = await res.json()
  return { ok: true as const, data }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  const raw = query.trim()

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
    // 2. Próba z oryginalnym zapytaniem.
    const first = await askNominatim(raw)
    if (!first.ok) {
      return NextResponse.json({ error: `Nominatim: ${first.status}` }, { status: 502 })
    }
    if (Array.isArray(first.data) && first.data.length > 0) {
      return NextResponse.json(first.data)
    }

    // 3. Pusto — próba z adresem bez przedrostka ("ul. Chłodna 2" -> "Chłodna 2").
    const cleaned = stripPrefixes(raw)
    if (cleaned && cleaned.toLowerCase() !== raw.toLowerCase() && cleaned.length >= 2) {
      const second = await askNominatim(cleaned)
      if (second.ok && Array.isArray(second.data) && second.data.length > 0) {
        return NextResponse.json(second.data)
      }
    }

    return NextResponse.json([])
  } catch (err) {
    console.error('[geocode] Fetch failed:', err)
    return NextResponse.json({ error: 'Nie można połączyć z serwisem geocodingu' }, { status: 500 })
  }
}
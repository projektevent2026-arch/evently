import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/verifyOrigin'
import { geocodeRateLimit, getClientIp } from '@/lib/rateLimit'

const NOMINATIM_HEADERS = {
  'User-Agent': 'Evently/1.0 (projektevent2026@gmail.com)',
  'Accept-Language': 'pl',
}

// Proxy ogólnego przeznaczenia dla wyszukiwania MIAST (op=search) i
// geokodowania odwrotnego, współrzędne -> nazwa miejscowości (op=reverse) —
// używane przez MobileHome.tsx, location-sidebar.tsx, EventMap.tsx.
//
// To NIE jest to samo co /api/geocode (tamten obsługuje pełne adresy z
// formularza dodawania wydarzenia, z inną logiką — usuwanie "ul.",
// parsowanie wklejonych współrzędnych).
//
// 2026-09-20: te pięć wywołań szło wcześniej WPROST z przeglądarki do
// Nominatim, co miało dwa problemy: (1) omijało nasz rate limiter,
// (2) nagłówek User-Agent ustawiany w JS jest po cichu ignorowany przez
// przeglądarki — "User-Agent" jest na liście "forbidden header names",
// więc Nominatim i tak widział prawdziwą przeglądarkę odwiedzającego,
// nie "Evently/1.0 (...)", co łamie ich regulamin (wymaga wiarygodnej
// identyfikacji aplikacji). Ten proxy naprawia oba na raz.
export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await geocodeRateLimit.limit(getClientIp(req))
  if (!success) {
    return NextResponse.json({ error: 'Zbyt wiele zapytań. Spróbuj za kilka minut.' }, { status: 429 })
  }

  const params = req.nextUrl.searchParams
  const op = params.get('op')

  try {
    if (op === 'reverse') {
      const lat = params.get('lat')
      const lon = params.get('lon')
      if (!lat || !lon) {
        return NextResponse.json({ error: 'Brak lat/lon' }, { status: 400 })
      }

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&accept-language=pl`
      const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        return NextResponse.json({ error: `Nominatim: ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (op === 'search') {
      const q = params.get('q')
      if (!q || q.trim().length < 2) {
        return NextResponse.json([])
      }

      // Biała lista parametrów — nic innego z zapytania nie jest
      // przepuszczane dalej do Nominatim bez kontroli.
      const limit = params.get('limit') || '5'
      const featureType = params.get('featureType')
      const addressdetails = params.get('addressdetails')

      let url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
        `&format=json&limit=${encodeURIComponent(limit)}&countrycodes=pl&accept-language=pl`
      if (featureType) url += `&featureType=${encodeURIComponent(featureType)}`
      if (addressdetails) url += `&addressdetails=${encodeURIComponent(addressdetails)}`

      const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        return NextResponse.json({ error: `Nominatim: ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Nieprawidłowy parametr op (search|reverse)' }, { status: 400 })
  } catch (err) {
    console.error('[nominatim] Fetch failed:', err)
    return NextResponse.json({ error: 'Nie można połączyć z serwisem geocodingu' }, { status: 500 })
  }
}
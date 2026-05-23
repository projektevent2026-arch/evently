import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&countrycodes=pl&addressdetails=1`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Evently/1.0 (kontakt@evently.pl)',
        'Accept-Language': 'pl',
      },
      signal: AbortSignal.timeout(5000), // 5 sekund max
    })

    if (!res.ok) {
        const body = await res.text()
        console.error(`[geocode] Nominatim ${res.status}:`, body)
        return NextResponse.json(
          { error: `Nominatim: ${res.status}` },
          { status: 502 }
        )
      }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (err) {
    console.error('[geocode] Fetch failed:', err)
    return NextResponse.json(
      { error: 'Nie można połączyć z serwisem geocodingu' },
      { status: 500 }
    )
  }
}
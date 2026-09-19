import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/verifyOrigin'
import { geocodeRateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await geocodeRateLimit.limit(getClientIp(req))
  if (!success) {
    return NextResponse.json({ error: 'Zbyt wiele zapytań. Spróbuj za kilka minut.' }, { status: 429 })
  }

  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json([])

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': 'Evently/1.0 (projektevent2026@gmail.com)' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim: ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[scan-poster/geocode] Fetch failed:', err)
    return NextResponse.json({ error: 'Nie można połączyć z serwisem geocodingu' }, { status: 500 })
  }
}
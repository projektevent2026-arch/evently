import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/verifyOrigin'

export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json([])

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { 'User-Agent': 'Evently/1.0' } }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
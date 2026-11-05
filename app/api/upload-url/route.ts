import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/verifyOrigin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { uploadAnonLimit, uploadUserLimit, getClientIp, hashKey } from '@/lib/rateLimit'

// Wydaje jednorazowy, podpisany adres do wgrania JEDNEGO zdjęcia do bucketu
// event-images. Nazwę pliku i rozszerzenie ustala serwer (klient nie podaje
// własnej nazwy). Limit wgrań:
// - bez konta: po skrócie adresu IP (20 na godzinę),
// - zalogowany: po koncie (200 na dobę),
// - admin i moderator: bez limitu.
// Plik trafia do Storage bezpośrednio z przeglądarki, więc Storage dalej sam
// pilnuje rozmiaru (5 MB) i typu (jpeg/png/webp).

const BUCKET = 'event-images'
const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  const ext = EXT_BY_TYPE[contentType]
  if (!ext) {
    return NextResponse.json({ error: 'Dozwolone formaty zdjęć: JPG, PNG, WebP.' }, { status: 400 })
  }

  // Kto pyta: token zalogowanego (nagłówek Authorization) albo anonim.
  let userId: string | null = null
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (token) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(token)
      userId = data?.user?.id ?? null
    } catch {
      userId = null // nieważny token traktujemy jak anonima
    }
  }

  let isStaff = false
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    isStaff = profile?.role === 'admin' || profile?.role === 'moderator'
  }

  if (!isStaff) {
    try {
      const result = userId
        ? await uploadUserLimit.limit(userId)
        : await uploadAnonLimit.limit(hashKey(getClientIp(req)))
      if (!result.success) {
        const msg = userId
          ? 'Dzienny limit wgrywania zdjęć został wykorzystany. Spróbuj jutro albo napisz do nas, a zwiększymy limit.'
          : 'Za dużo wgranych zdjęć w krótkim czasie. Spróbuj za godzinę albo zaloguj się.'
        return NextResponse.json({ error: msg }, { status: 429 })
      }
    } catch (err) {
      // Redis niedostępny: lepiej przepuścić wgranie niż zablokować cały formularz.
      console.error('[upload-url] limiter niedostępny, przepuszczam:', err)
    }
  }

  const path = `event_${crypto.randomUUID()}.${ext}`
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[upload-url] createSignedUploadUrl:', error)
    return NextResponse.json({ error: 'Nie udało się przygotować wysyłania zdjęcia.' }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token })
}
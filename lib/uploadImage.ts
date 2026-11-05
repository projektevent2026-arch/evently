import { supabase } from '@/lib/supabase'

// Wspólne wgrywanie zdjęć do bucketu event-images (okładka, plakat, galeria, skan).
// 2026-11-04: plik nie leci już prosto do Storage z otwartą polityką INSERT dla
// wszystkich. Najpierw prosimy własny endpoint o podpisany, jednorazowy adres
// (/api/upload-url), a ten sprawdza limit wgrań (inny dla anonimowych i
// zalogowanych) i sam ustala nazwę pliku oraz rozszerzenie. Plik nadal idzie
// bezpośrednio do Supabase (omija limit ok. 4,5 MB treści żądania na Vercelu),
// a Storage dalej pilnuje 5 MB i typów jpeg/png/webp.

const BUCKET = 'event-images'

export type UploadImageResult = { url: string } | { error: string }

export async function uploadEventImage(blob: Blob, contentType: string): Promise<UploadImageResult> {
  // Zalogowany organizator dostaje wyższy limit — endpoint rozpozna go po tokenie.
  let token: string | null = null
  try {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token ?? null
  } catch {
    token = null
  }

  let res: Response
  try {
    res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ contentType }),
    })
  } catch {
    return { error: 'Brak połączenia z serwerem. Spróbuj ponownie.' }
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.path || !body?.token) {
    return { error: body?.error || 'Nie udało się przygotować wysyłania zdjęcia.' }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(body.path, body.token, blob, {
      contentType,
      cacheControl: '31536000', // 1 rok — plakaty się nie zmieniają
      upsert: false,
    })
  if (error || !data) {
    return { error: 'Upload nieudany: ' + (error?.message || 'nieznany błąd') }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path || body.path)
  return { url: urlData.publicUrl }
}
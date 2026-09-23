import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAllowedOrigin } from '@/lib/verifyOrigin'

// Strona główna jest cache'owana (export const revalidate = 60 w
// app/page.tsx) — świetne dla szybkości, ale bez tego endpointu świeżo
// dodane/zmienione wydarzenie mogło być niewidoczne na stronie głównej
// nawet do minuty po publikacji. Wywoływane z klienta zaraz po każdej
// udanej operacji, która zmienia to, co widać na liście publicznej:
// dodanie/edycja wydarzenia publikowanego od razu (organizator, admin),
// zatwierdzenie/usunięcie/przywrócenie w panelu admina.
//
// isAllowedOrigin: to samo zabezpieczenie co przy innych endpointach —
// bez niego ktokolwiek znający adres mógłby wymuszać odświeżanie na
// żądanie. Koszt nadużycia tu jest niski (tylko zapytanie do bazy, nie
// płatne API), ale zero powodu, żeby zostawiać to otwarte bez potrzeby.
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  revalidatePath('/')
  return NextResponse.json({ revalidated: true })
}
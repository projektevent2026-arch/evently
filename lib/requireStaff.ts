import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// ============================================================
// Weryfikacja "czy to naprawdę zalogowany PRACOWNIK (admin LUB
// moderator)" — na podstawie PRAWDZIWEJ sesji z ciasteczek, nie na
// podstawie tego, co frontend twierdzi że jest prawdą. Zwykły klient
// (ANON_KEY, respektujący RLS), nie supabaseAdmin — to świadome,
// service_role pojawia się dopiero PO tym sprawdzeniu, w samym route
// handlerze, nigdy jako mechanizm autoryzacji sam w sobie.
//
// 2026-09-20: plik i funkcja przemianowane z requireAdmin() —
// nazwa myliła, bo faktycznie wpuszczała admina ORAZ moderatora.
// Endpoint zmiany ról (jedyne miejsce wymagające ŚCIŚLE samego admina)
// ma teraz własny, dodatkowy, jawny warunek na to nad tą funkcją —
// requireStaff() nigdy sam w sobie nie oznacza "tylko admin".
// ============================================================
export async function requireStaff() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, status: 401, error: "Musisz być zalogowany." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return { ok: false as const, status: 403, error: "Brak uprawnień." }
  }

  return { ok: true as const, userId: user.id, role: profile.role }
}
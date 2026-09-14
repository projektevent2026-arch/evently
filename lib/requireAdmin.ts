import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// ============================================================
// Weryfikacja "czy to naprawdę zalogowany admin/moderator" — na
// podstawie PRAWDZIWEJ sesji z ciasteczek, nie na podstawie tego,
// co frontend twierdzi że jest prawdą. Zwykły klient (ANON_KEY,
// respektujący RLS), nie supabaseAdmin — to świadome, service_role
// pojawia się dopiero PO tym sprawdzeniu, w samym route handlerze,
// nigdy jako mechanizm autoryzacji sam w sobie.
// ============================================================
export async function requireAdmin() {
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
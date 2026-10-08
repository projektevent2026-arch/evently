import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/requireStaff"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  // Autoryzacja PIERWSZA — zanim cokolwiek dotknie supabaseAdmin.
  const auth = await requireStaff()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Te dwa zapytania nie zależą od siebie nawzajem (jedno pyta Supabase
  // Auth o konta, drugie bazę o role) — dotąd czekały jedno na drugie bez
  // potrzeby. Autoryzacja (requireAdmin powyżej) zostaje sekwencyjna i
  // pierwsza — to jedyna część, która MUSI skończyć się przed dotknięciem
  // service_role.
  const [
    { data: authUsers, error: authError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("profiles").select("id, role, organization_name, avatar_url"),
  ])

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]))

  const merged = authUsers.users
    .map((u: any) => {
      const profile = profileById.get(u.id)
      return {
        id: u.id,
        email: u.email,
        role: profile?.role || "user",
        organization_name: profile?.organization_name || null,
        avatar_url: profile?.avatar_url || null,
        created_at: u.created_at,
      }
    })
    .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))

  // currentUserId: panel użytkowników blokuje edycję roli własnego konta
  // (egzekwuje to i tak API zmiany roli — to tylko podpowiedź dla UI).
  return NextResponse.json({ users: merged, currentUserId: auth.userId })
}
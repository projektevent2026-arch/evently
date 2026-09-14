import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  // Autoryzacja PIERWSZA — zanim cokolwiek dotknie supabaseAdmin.
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const roleById = new Map((profiles || []).map((p: any) => [p.id, p.role]))

  const merged = authUsers.users
    .map((u: any) => ({
      id: u.id,
      email: u.email,
      role: roleById.get(u.id) || "user",
      created_at: u.created_at,
    }))
    .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))

  return NextResponse.json({ users: merged })
}
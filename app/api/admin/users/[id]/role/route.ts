import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const ALLOWED_ROLES = ["admin", "moderator", "organizer", "user"]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Autoryzacja PIERWSZA, tak samo jak w GET — nigdy nie ufamy
  // temu, co przysyła frontend o tym, kim jest wywołujący.
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const newRole = body?.role

  if (!ALLOWED_ROLES.includes(newRole)) {
    return NextResponse.json({ error: "Nieprawidłowa rola." }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
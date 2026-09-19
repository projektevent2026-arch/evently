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

  // Nie pozwalamy zalogowanemu adminowi/moderatorowi odebrać samemu
  // sobie dostępu do panelu z tego panelu — jedyny sposób cofnięcia
  // takiej pomyłki byłby wtedy ręcznie, przez dashboard Supabase.
  if (id === auth.userId && !["admin", "moderator"].includes(newRole)) {
    return NextResponse.json(
      { error: "Nie możesz odebrać samemu sobie roli administratora/moderatora z tego panelu." },
      { status: 400 }
    )
  }

  // Moderator ma dziś te same uprawnienia co admin w całej reszcie apki,
  // ale zarządzanie RÓLAMI świadomie zostaje wyłącznie po stronie admina:
  // moderator nie rusza konta admina, i nie mianuje nowego moderatora.
  if (auth.role === "moderator") {
    if (newRole === "moderator") {
      return NextResponse.json(
        { error: "Tylko admin może nadać rolę moderatora." },
        { status: 403 }
      )
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single()

    if (targetProfile?.role === "admin") {
      return NextResponse.json(
        { error: "Moderator nie może zmieniać roli administratora." },
        { status: 403 }
      )
    }
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
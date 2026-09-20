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

  // Nie pozwalamy zalogowanemu adminowi odebrać samemu sobie dostępu do
  // panelu z tego panelu — jedyny sposób cofnięcia takiej pomyłki byłby
  // wtedy ręcznie, przez dashboard Supabase.
  if (id === auth.userId && !["admin", "moderator"].includes(newRole)) {
    return NextResponse.json(
      { error: "Nie możesz odebrać samemu sobie roli administratora/moderatora z tego panelu." },
      { status: 400 }
    )
  }

  // Moderator ma dziś te same uprawnienia co admin w całej reszcie apki,
  // ale zarządzanie RÓLAMI jest wyłącznie po stronie admina — PEŁNY zakaz,
  // nie kolejny przypadek szczególny. Wcześniejsza wersja blokowała tylko
  // "nadaj rolę moderatora" i "dotknij istniejącego admina", ale przepuszczała
  // moderatora zmieniającego SAMEGO SIEBIE na admina (jego własna rola w
  // momencie sprawdzenia to jeszcze "moderator", nie "admin", więc żaden z
  // tamtych dwóch warunków tego nie łapał). Zamiast dorzucać trzeci
  // przypadek szczególny — moderator po prostu nie ma tu nic do roboty.
  if (auth.role === "moderator") {
    return NextResponse.json(
      { error: "Tylko administrator może zarządzać rolami." },
      { status: 403 }
    )
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
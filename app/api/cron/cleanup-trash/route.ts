import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// ============================================================
// CRON — czyszczenie kosza (2026-09-22)
//
// Wywoływane raz dziennie przez Vercel Cron (patrz vercel.json).
// Trwale usuwa wydarzenia, które są w koszu (deleted_at ustawione
// w app/admin/page.tsx przy "usuń") od WIĘCEJ niż 30 dni — dokładnie
// ta sama granica, którą panel admina już pokazuje jako
// "na stałe za X dni" (patrz daysUntilPurge w app/admin/page.tsx).
// Do dziś nic realnie tego nie egzekwowało — kosz rósł bez końca
// (58 pozycji, zero automatycznego czyszczenia).
//
// Autoryzacja: Vercel Cron automatycznie wysyła nagłówek
// "Authorization: Bearer <CRON_SECRET>", jeśli zmienna środowiskowa
// CRON_SECRET jest ustawiona w projekcie na Vercelu. Bez tego
// sprawdzenia KAŻDY w internecie mógłby wywołać ten endpoint i
// skasować kosz na żądanie — stąd to musi być PIERWSZE, zanim
// cokolwiek dotknie supabaseAdmin (ten sam wzorzec co requireStaff
// w innych endpointach /api/admin/*).
// ============================================================
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  // Wydarzenia w koszu dłużej niż 30 dni.
  const { data: toPurge, error: selectError } = await supabaseAdmin
    .from("events")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff.toISOString())

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (!toPurge || toPurge.length === 0) {
    return NextResponse.json({ purged: 0 })
  }

  const ids = toPurge.map((e) => e.id)

  // Kolejność jak w AdminWydarzenie.tsx / moje-wydarzenia/page.tsx:
  // najpierw tabele zależne (event_dates, event_attendees), dopiero
  // potem sam events — niezależnie od tego, czy w bazie jest
  // skonfigurowany ON DELETE CASCADE (SQL nie jest wersjonowany w
  // repo, więc nie zakładamy niczego o bazie, tylko robimy to jawnie).
  const { error: datesError } = await supabaseAdmin.from("event_dates").delete().in("event_id", ids)
  if (datesError) {
    return NextResponse.json({ error: datesError.message }, { status: 500 })
  }

  const { error: attendeesError } = await supabaseAdmin.from("event_attendees").delete().in("event_id", ids)
  if (attendeesError) {
    return NextResponse.json({ error: attendeesError.message }, { status: 500 })
  }

  const { error: eventsError, data: deleted } = await supabaseAdmin
    .from("events")
    .delete()
    .in("id", ids)
    .select("id")

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  // UWAGA — świadomie NIE ruszamy: pliki w Storage (bucket
  // "event-images") powiązane z tymi wydarzeniami zostają osierocone.
  // To osobny, mniejszy problem (miejsce na dysku, nie dane wrażliwe)
  // i celowo poza zakresem tej zmiany — jeśli kiedyś zacznie realnie
  // kosztować, to osobna, krótka poprawka, nie coś do doklejania tu.
  return NextResponse.json({ purged: deleted?.length ?? ids.length, ids })
}
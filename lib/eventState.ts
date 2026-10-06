// lib/eventState.ts
//
// 2026-10-07: jedno miejsce, które mówi, co pokazać pod linkiem do wydarzenia.
//  - "live"   → normalna strona wydarzenia (status published, nie usunięte),
//  - "ended"  → wydarzenie zarchiwizowane (już się odbyło), pokazujemy stronę "wydarzenie zakończone"
//               zamiast błędu "nie znaleziono", żeby stary link wysłany znajomemu nie wyglądał na awarię,
//  - "hidden" → wszystko inne (usunięte, oczekujące, szkic, nieistniejące): zachowanie jak dotąd,
//               czyli nic nie ujawniamy.
export type EventState = "live" | "ended" | "hidden"

export function eventState(
  e: { status?: string | null; deleted_at?: string | null } | null | undefined
): EventState {
  if (!e || e.deleted_at) return "hidden"
  if (e.status === "published") return "live"
  if (e.status === "archived") return "ended"
  return "hidden"
}
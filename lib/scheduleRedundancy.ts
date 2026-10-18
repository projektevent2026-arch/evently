// lib/scheduleRedundancy.ts
//
// 2026-10-08: program wydarzenia z JEDNYM punktem, który powtarza tytuł wydarzenia
// (bez opisu), nie niesie żadnej informacji — godzinę i tytuł strona i tak pokazuje
// w nagłówku i w pasku informacji. Skaner plakatów potrafi taki program utworzyć
// sam (jeden punkt "18:30 Tytuł wydarzenia"), co dawało zdublowaną linijkę pod
// opisem i zbędną zakładkę "Program".
//
// Zwraca true tylko gdy WSZYSTKIE warunki są spełnione:
//  - program ma dokładnie jeden punkt (we wszystkich dniach razem),
//  - punkt nie ma opisu,
//  - tytuł punktu jest taki sam jak tytuł wydarzenia (po normalizacji: małe litery,
//    bez polskich znaków i znaków specjalnych) albo jeden zawiera drugi (min. 6 znaków).
// Program z opisem, z dwoma i więcej punktami albo z innym tytułem zostaje bez zmian.
function normalize(s: string): string {
    return s
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
  
  export function isRedundantSchedule(schedule: any, eventTitle: string | null | undefined): boolean {
    if (!Array.isArray(schedule) || schedule.length === 0) return false
    const items: any[] = schedule.flatMap((d: any) => (Array.isArray(d?.items) ? d.items : []))
    if (items.length !== 1) return false
    const item = items[0]
    if (String(item?.description ?? "").trim()) return false
    const a = normalize(String(item?.title ?? item?.name ?? ""))
    const b = normalize(String(eventTitle ?? ""))
    if (!a || !b) return false
    if (a === b) return true
    return Math.min(a.length, b.length) >= 6 && (a.includes(b) || b.includes(a))
  }
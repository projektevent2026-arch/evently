// lib/scheduleType.ts
//
// Jedno źródło prawdy dla klasyfikacji Terminów — używane zarówno przez
// formularze (przy zapisie) jak i przez Krok D (karty/mapa/filtry przy
// odczycie). NIE duplikować tej logiki gdzie indziej.
//
// Zasada, ustalona i zwalidowana wcześniej: gap = dokładnie 1 dzień między
// kolejnymi datami = wielodniowy zakres (range). gap > 1 dzień = cykliczny
// (recurring). Nigdy nie zgadujemy na podstawie godzin — tylko na podstawie
// samych dat.

export type ScheduleType = "range" | "recurring" | "per_day" | "needs_review"

export type DateEntry = { date: string; from: string; to: string }

/**
 * Klasyfikuje listę wpisów Terminów na podstawie luk między datami.
 * - 0 lub 1 poprawna data -> "range" (jednodniowy, brak dwuznaczności)
 * - wszystkie kolejne daty oddalone o dokładnie 1 dzień -> "range" (wielodniowy)
 * - jakakolwiek luka > 1 dnia między kolejnymi datami -> "recurring"
 */
export function classifySchedule(entries: DateEntry[]): ScheduleType {
  const valid = entries
    .filter((e) => e.date)
    .map((e) => e.date)
    .sort((a, b) => a.localeCompare(b))

  if (valid.length <= 1) return "range"

  for (let i = 1; i < valid.length; i++) {
    const a = new Date(valid[i - 1])
    const b = new Date(valid[i])
    const gapDays = Math.round((+b - +a) / 86400000)
    if (gapDays !== 1) return "recurring"
  }
  return "range"
}

/**
 * Krótki, czytelny dla człowieka opis tego, co apka zrozumiała z Terminów —
 * do wyświetlenia pod polem formularza (żywy podgląd klasyfikacji).
 */
export function describeSchedule(entries: DateEntry[]): {
  kind: string
  what: string
  scheduleType: ScheduleType
} | null {
  const valid = entries
    .filter((e) => e.date)
    .map((e) => e.date)
    .sort((a, b) => a.localeCompare(b))

  if (valid.length < 1) return null

  const MONTHS_PL = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
  ]
  const isoToPl = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "")
    if (!m) return iso
    return `${+m[3]} ${MONTHS_PL[+m[2] - 1]}`
  }

  const scheduleType = classifySchedule(entries)

  if (valid.length === 1) {
    return { kind: "Wydarzenie jednodniowe", what: `Na karcie: ${isoToPl(valid[0])}`, scheduleType }
  }

  if (scheduleType === "range") {
    return {
      kind: `Impreza ${valid.length}-dniowa`,
      what: `Na karcie: ${isoToPl(valid[0])} – ${isoToPl(valid[valid.length - 1])} · program dostanie ${valid.length} zakładki dni`,
      scheduleType,
    }
  }

  return {
    kind: `Wydarzenie cykliczne — ${valid.length} terminów`,
    what: `Na karcie pokaże się najbliższy: ${isoToPl(valid[0])}. Po nim apka przeskoczy na ${isoToPl(valid[1])}.`,
    scheduleType,
  }
}
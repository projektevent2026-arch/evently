export type ScheduleType = "range" | "recurring" | "per_day" | "needs_review"

export type DateEntry = { date: string; from: string; to: string }

/**
 * Klasyfikuje listę wpisów Terminów na podstawie luk między datami.
 * Gap = dokładnie 1 dzień między kolejnymi datami -> wielodniowy zakres (range).
 * Gap > 1 dzień -> cykliczny (recurring).
 * Pojedyncza data -> range (jednodniowy, brak dwuznaczności).
 */
export function classifySchedule(entries: DateEntry[]): ScheduleType {
  const valid = entries
    .filter(e => e.date)
    .map(e => e.date)
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
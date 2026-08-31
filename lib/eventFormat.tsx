// lib/eventFormat.tsx
//
// Współdzielone helpery formatowania dat/godzin i pomocnicze funkcje UI dla
// stron szczegółów wydarzenia oraz kart/list wydarzeń. Wcześniej te same
// koncepcje ("najbliższy termin", "czy to dziś/jutro") były reimplementowane
// niezależnie w kilku miejscach — EventPageClient.tsx/MobileEventDetail.tsx
// (dateRange/isMultiDay/durationLabel itd.), MobileHome.tsx (getDateParts/
// isToday/isTomorrow/thisWeekendRange) i /ulubione (dateBadgeParts). Jedno
// źródło prawdy eliminuje ryzyko, że poprawka w jednym miejscu zostanie
// zapomniana gdzie indziej — dokładnie tak powstał bug z "DZIŚ" na
// 2026-08-31, gaszony w kilku plikach osobno tego samego dnia.
//
// Nazwy dat wejściowych to zwykle pełny timestamp albo sama data
// "YYYY-MM-DD" — funkcje tu operują na sufiksie .slice(0,10) i kotwiczą
// new Date(...) w południe lokalnym ("T12:00:00"), żeby uniknąć
// przesunięcia dnia przy konwersji stref (ten sam rodzaj bugu co
// toISOString() w todayStr() — patrz EventDatesList.tsx, AdminWydarzenie.tsx,
// app/dodaj-wydarzenie/page.tsx).

import type { EventDateRow } from "@/lib/getEventWithDates"

// ── Dzień kalendarzowy jako string, wyłącznie w czasie LOKALNYM ──────────
// Nigdy przez toISOString() (konwertuje na UTC, cofa datę o dzień wieczorem
// w Polsce). Budujemy string ręcznie z lokalnych getFullYear/getMonth/getDate.

export function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return localDateStr(new Date())
}

export function addDaysStr(base: string, days: number): string {
  const d = new Date(base.slice(0, 10) + "T12:00:00")
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

// Ostatni dzień KALENDARZOWEGO miesiąca, do którego należy `base`.
export function endOfMonthStr(base: string): string {
  const d = new Date(base.slice(0, 10) + "T12:00:00")
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return localDateStr(end)
}

export function isSameLocalDate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function isToday(dateStr: string): boolean {
  return dateStr.slice(0, 10) === todayStr()
}

export function isTomorrow(dateStr: string): boolean {
  return dateStr.slice(0, 10) === addDaysStr(todayStr(), 1)
}

// Zakres NAJBLIŻSZEGO weekendu jako pary stringów: piątek -> niedziela
// (włącznie). W sobotę/niedzielę zwraca trwający weekend (nie przeskakuje
// na następny). Pon–czw -> nadchodzący piątek. Czysto na stringach, bez
// arytmetyki na Date.getTime() — mniej podatne na pomyłki ze strefami.
export function thisWeekendRange(): [string, string] {
  const day = new Date().getDay() // 0=niedz, 1=pon, ... 5=pt, 6=sob
  const offsetToFriday = day === 0 ? -2 : 5 - day // sob(-1), niedz(-2), pt(0), pon(+4)...
  const start = addDaysStr(todayStr(), offsetToFriday)
  const end = addDaysStr(start, 2)
  return [start, end]
}

export function isThisWeekend(dateStr: string): boolean {
  const [start, end] = thisWeekendRange()
  const d = dateStr.slice(0, 10)
  return d >= start && d <= end
}

const MONTH_PL_SHORT = ["STY","LUT","MAR","KWI","MAJ","CZE","LIP","SIE","WRZ","PAŹ","LIS","GRU"]

// Dzień/miesiąc (skrót) + flagi dziś/jutro dla pojedynczej daty — używane na
// kartach wydarzeń (MobileHome.tsx) i badge'ach na /ulubione. Wcześniej ta
// sama logika była reimplementowana osobno w obu miejscach (getDateParts /
// dateBadgeParts) — teraz jedno źródło.
export function dateBadgeParts(dateStr: string): { day: number; month: string; isToday: boolean; isTomorrow: boolean } {
  const dOnly = dateStr.slice(0, 10)
  const dt = new Date(dOnly + "T12:00:00")
  return {
    day: dt.getDate(),
    month: MONTH_PL_SHORT[dt.getMonth()],
    isToday: isToday(dOnly),
    isTomorrow: isTomorrow(dOnly),
  }
}

// ── Formatowanie dat/godzin do wyświetlania ───────────────────────────────

// "2026-09-06..." -> "6 września 2026"
export function fmtDate(d?: string | null): string {
  if (!d) return ""
  const dt = new Date(d.slice(0, 10) + "T12:00:00")
  return dt.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })
}

// "2026-09-06..." -> "niedziela"
export function weekdayName(d?: string | null): string {
  if (!d) return ""
  const dt = new Date(d.slice(0, 10) + "T12:00:00")
  return dt.toLocaleDateString("pl-PL", { weekday: "long" })
}

// Zakres dat: "25–26 lipca 2026" gdy ten sam miesiąc, inaczej pełne obie
// daty. Jednodniowy -> sama data.
export function dateRange(start?: string | null, end?: string | null): string {
  if (!start) return ""
  const s = start.slice(0, 10)
  const e = end ? end.slice(0, 10) : ""
  if (!e || e === s) return fmtDate(s)
  if (s.slice(0, 7) === e.slice(0, 7)) {
    return `${parseInt(s.slice(8, 10), 10)}–${fmtDate(e)}`
  }
  return `${fmtDate(s)} – ${fmtDate(e)}`
}

// Czy event trwa więcej niż jeden dzień (porównanie samych dat, bez godzin).
export function isMultiDay(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false
  return start.slice(0, 10) !== end.slice(0, 10)
}

// Godzina wyciągana wprost ze stringa timestampu (np. "2026-09-06 16:00:00+00"
// albo "...T16:00"), BEZ new Date — żeby nie przeliczać stref.
export function fmtClock(ts?: string | null): string {
  if (!ts) return ""
  const m = /[T ](\d{2}):(\d{2})/.exec(String(ts))
  return m ? `${m[1]}:${m[2]}` : ""
}

// Czas trwania z godzin start/end: "1 h 30 min", samo "2 h" gdy pełne
// godziny, puste gdy brak jednej z godzin albo end <= start.
export function durationLabel(startTs?: string | null, endTs?: string | null): string {
  const s = fmtClock(startTs)
  const e = fmtClock(endTs)
  if (!s || !e) return ""
  const [sh, sm] = s.split(":").map(Number)
  const [eh, em] = e.split(":").map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ""
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

// Dla eventu z wieloma terminami: najbliższy NADCHODZĄCY termin + licznik
// pozostałych. Jeśli WSZYSTKIE terminy już minęły, zwraca ostatni
// (najnowszy z przeszłych) — lepsze niż pusty pasek.
export function nextTermInfo(eventDates: EventDateRow[] | undefined | null): { label: string; remaining: number } | null {
  if (!eventDates || eventDates.length <= 1) return null
  const today = todayStr()
  const sorted = [...eventDates].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter(d => d.date.slice(0, 10) >= today)
  const chosen = upcoming.length > 0 ? upcoming[0] : sorted[sorted.length - 1]
  const remaining = upcoming.length > 0 ? upcoming.length - 1 : 0
  return { label: fmtDate(chosen.date), remaining }
}

// Zamienia URL-e w tekście na klikalne linki. Reszta tekstu (w tym akapity
// dzięki whitespace-pre-line w otaczającym <p>) zostaje bez zmian. Końcowa
// interpunkcja (., ,) nie wpada do linka.
// variant="light" -> inline style (EventPageClient/desktop, jasne tło),
// variant="dark" -> tailwind className (MobileEventDetail, ciemne tło).
export function linkify(text: string, variant: "light" | "dark" = "light") {
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g)
  const linkStyle = variant === "light"
    ? { color: "#16a34a", textDecoration: "underline", wordBreak: "break-all" as const }
    : undefined
  const linkClassName = variant === "dark" ? "text-green-400 underline break-all" : undefined

  return parts.map((part, i) => {
    if (/^(https?:\/\/|www\.)/.test(part)) {
      const trailing = part.match(/[.,);]+$/)?.[0] ?? ""
      const clean = trailing ? part.slice(0, part.length - trailing.length) : part
      const href = clean.startsWith("http") ? clean : `https://${clean}`
      return (
        <span key={i}>
          <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle} className={linkClassName}>
            {clean}
          </a>
          {trailing}
        </span>
      )
    }
    return part ? <span key={i}>{part}</span> : null
  })
}

// Escapowanie tekstu do formatu .ics.
export function icsEscape(s: string) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

// Generuje i pobiera plik .ics. Na telefonie tapnięcie od razu otwiera
// Kalendarz (Google/Apple) z gotowym wpisem = darmowe przypomnienie bez push.
export function downloadIcs(event: any) {
  const startDate = (event.start_date || "").slice(0, 10).replace(/-/g, "")
  if (!startDate) return
  const startT = (event.start_time || "").slice(0, 5).replace(":", "")
  const endDate = (event.end_date || event.start_date || "").slice(0, 10).replace(/-/g, "")
  const endT = (event.end_time || "").slice(0, 5).replace(":", "")

  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

  let timeLines: string[]
  if (startT) {
    timeLines = [`DTSTART:${startDate}T${startT}00`]
    if (endT) timeLines.push(`DTEND:${endDate}T${endT}00`)
    else timeLines.push("DURATION:PT2H")
  } else {
    timeLines = [`DTSTART;VALUE=DATE:${startDate}`, "DURATION:P1D"]
  }

  const loc = [event.venue_name, event.address, event.city].filter(Boolean).join(", ")

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Evently//PL//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id || event.slug || "evently"}@evently`,
    `DTSTAMP:${dtstamp}`,
    ...timeLines,
    `SUMMARY:${icsEscape(event.title)}`,
    loc ? `LOCATION:${icsEscape(loc)}` : "",
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)

  const ics = lines.join("\r\n")
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${event.slug || "wydarzenie"}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
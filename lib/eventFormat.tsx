// lib/eventFormat.tsx
//
// Współdzielone helpery formatowania dat/godzin i pomocnicze funkcje UI dla
// stron szczegółów wydarzenia. Wcześniej te same funkcje były zduplikowane
// 1:1 (czasem pod różnymi nazwami: fmt/fmtDate, clockFromTimestamp/fmtClock)
// w EventPageClient.tsx (desktop) i MobileEventDetail.tsx (mobile) — jedno
// źródło prawdy eliminuje ryzyko, że poprawka w jednym pliku zostanie
// zapomniana w drugim (dokładnie tak powstał bug z "DZIŚ" na 2026-08-31).
//
// Nazwy dat wejściowych to zwykle pełny timestamp albo sama data
// "YYYY-MM-DD" — funkcje tu operują na sufiksie .slice(0,10) i kotwiczą
// new Date(...) w południe lokalnym ("T12:00:00"), żeby uniknąć
// przesunięcia dnia przy konwersji stref (ten sam rodzaj bugu co
// toISOString() w todayStr() — patrz EventDatesList.tsx, AdminWydarzenie.tsx,
// app/dodaj-wydarzenie/page.tsx).

import type { EventDateRow } from "@/lib/getEventWithDates"

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

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Dla eventu z wieloma terminami: najbliższy NADCHODZĄCY termin + licznik
// pozostałych. Jeśli WSZYSTKIE terminy już minęły, zwraca ostatni
// (najnowszy z przeszłych) — lepsze niż pusty pasek.
//
// PRZY KONSOLIDACJI POPRAWIONO: "dzisiaj" liczone teraz przez localDateStr()
// zamiast new Date().toISOString().slice(0,10) — ten drugi wariant miał
// (węższe niż setHours(0,0,0,0), ale realne) okno błędu między północą UTC
// a północą czasu polskiego, w którym zwracał wczorajszą datę. Ten sam
// rodzaj bugu naprawiany dziś w kilku innych miejscach projektu.
export function nextTermInfo(eventDates: EventDateRow[] | undefined | null): { label: string; remaining: number } | null {
  if (!eventDates || eventDates.length <= 1) return null
  const today = localDateStr(new Date())
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
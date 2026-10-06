import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

// 2026-10-07: strona pokazywana pod linkiem do wydarzenia, które już się odbyło i zostało
// zarchiwizowane (patrz lib/eventState.ts). Zamiast błędu "nie znaleziono" odwiedzający widzi, że
// wydarzenie się skończyło, i dostaje listę najbliższych wydarzeń, żeby zostać w serwisie.
// Celowo bez daty: dla wydarzeń cyklicznych start_date to pierwszy termin serii, więc data byłaby myląca.
export type UpcomingEvent = {
  id: string
  slug: string | null
  title: string
  city: string | null
  next_date: string | null
  next_start_time: string | null
}

function formatWhen(date: string | null, time: string | null): string {
  if (!date) return ""
  // Południe, żeby strefa czasowa serwera nie przesunęła dnia.
  const d = new Date(date.slice(0, 10) + "T12:00:00")
  const day = d.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
  return time ? `${day}, ${time.slice(0, 5)}` : day
}

export default function EndedEvent({
  title,
  city,
  upcoming,
}: {
  title: string
  city: string | null
  upcoming: UpcomingEvent[]
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Wróć do wydarzeń
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-3 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Wydarzenie zakończone
          </p>
          <h1 className="break-words text-2xl font-bold [overflow-wrap:anywhere]">{title}</h1>
          {city && (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} aria-hidden="true" /> {city}
            </p>
          )}
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            To wydarzenie już się odbyło.{" "}
            {upcoming.length > 0
              ? "Poniżej znajdziesz to, co dzieje się w najbliższym czasie."
              : "Zajrzyj na stronę główną, żeby zobaczyć, co dzieje się w pobliżu."}
          </p>
        </div>

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Najbliższe wydarzenia</h2>
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.slug || e.id}`}
                    className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {[formatWhen(e.next_date, e.next_start_time), e.city].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zobacz wszystkie wydarzenia
        </Link>
      </div>
    </main>
  )
}
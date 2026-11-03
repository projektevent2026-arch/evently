import { cache } from "react"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import EventDetailWrapper from "@/components/EventDetailWrapper"
import EndedEvent from "@/components/EndedEvent"
import { eventState } from "@/lib/eventState"
import { safeUrl } from "@/lib/safeUrl"
import { loadEvent } from "@/lib/loadEvent"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 2026-10-07: jedno zapytanie na żądanie (cache z Reacta) zamiast osobnych dla metadanych i strony.
// Pobieramy wydarzenie BEZ filtra statusu, bo musimy odróżnić "opublikowane" od "zarchiwizowane"
// (strona "wydarzenie zakończone"). To celowe odstępstwo od publishedFilter(): o tym, co z wiersza
// wolno pokazać, decyduje eventState() z lib/eventState.ts, a usunięte, oczekujące i szkice dają
// "hidden", czyli to samo co dotąd (nic nie ujawniamy).
const getEvent = cache(async (slug: string) => {
  const { data } = await supabase
    .from("public_events")
    .select("title, short_description, cover_image_url, city, start_date, status, deleted_at, photos_url")
    .eq(/^[0-9a-f-]{36}$/i.test(slug) ? "id" : "slug", slug)
    .maybeSingle()
  return data
})

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)
  const state = eventState(event)

  if (!event || state === "hidden") {
    return {
      title: "Wydarzenie | Evently",
      description: "Odkrywaj lokalne wydarzenia w swojej okolicy.",
    }
  }

  const date = event.start_date
    ? new Date(event.start_date).toLocaleDateString("pl-PL", {
        day: "numeric", month: "long", year: "numeric",
      })
    : ""

  // Zakończone wydarzenie: podgląd linku (Facebook, Messenger) zostaje z tytułem i zdjęciem,
  // ale z informacją, że już się odbyło, i bez indeksowania przez wyszukiwarki.
  const description = state === "ended"
    ? "To wydarzenie już się odbyło."
    : event.short_description || `${date}${event.city ? ` · ${event.city}` : ""}`

  const image = event.cover_image_url
    || "https://evently-silk-omega.vercel.app/og-default.jpg"

  return {
    title: `${event.title} | Evently`,
    description,
    ...(state === "ended" ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: event.title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: event.title }],
      type: "website",
      locale: "pl_PL",
      siteName: "Evently",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image],
    },
  }
}

export default async function EventPage(
  { params, searchParams }: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ preview?: string | string[] }>
  }
) {
  const { slug } = await params
  // 2026-11-03: ?preview=1 przy zakończonym wydarzeniu pokazuje PEŁNĄ stronę (terminy, mapa, cena)
  // zamiast widoku "zakończone". Używa tego karta archiwalnego wydarzenia w Moich wydarzeniach.
  // Dane archiwalnych wydarzeń i tak są publiczne (polityka SELECT: published + archived), więc to
  // niczego nie ujawnia. Wyszukiwarki dalej dostają noindex (generateMetadata dla stanu "ended").
  const { preview } = await searchParams
  const isPreview = preview === "1"
  // 2026-11-02 (B31): pełne dane wydarzenia (terminy, profil organizatora) pobieramy na serwerze,
  // RÓWNOLEGLE z wąskim zapytaniem do metadanych, żeby nie wydłużać odpowiedzi o drugi krok.
  // loadEvent zwraca null dla niepublikowanych i usuniętych, a gdy cokolwiek pójdzie nie tak,
  // komponenty pobierają dane w przeglądarce jak dotychczas (initialEvent = null).
  const [event, fullEvent] = await Promise.all([
    getEvent(slug),
    loadEvent(supabase, slug, false),
  ])

  const ended = !!event && eventState(event) === "ended"

  if (ended && !isPreview) {
    // Ten sam widok co lista na stronie głównej: tylko opublikowane i jeszcze nie zakończone terminy.
    const { data: upcoming } = await supabase
      .from("published_events_with_next_date")
      .select("id, slug, title, city, next_date, next_start_time")
      .order("next_date", { ascending: true })
      .limit(4)

    return <EndedEvent title={event.title} city={event.city} upcoming={upcoming ?? []} photosUrl={safeUrl(event.photos_url)} />
  }

  // Dla zakończonego wydarzenia w podglądzie nie przekazujemy danych z serwera (loadEvent zwraca
  // tylko opublikowane): komponenty pobiorą je w przeglądarce w trybie podglądu.
  const initialEvent = event && !ended && eventState(event) !== "hidden" ? fullEvent : null
  return <EventDetailWrapper slug={slug} initialEvent={initialEvent} endedPreview={ended} />
}
import { cache } from "react"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import EventDetailWrapper from "@/components/EventDetailWrapper"
import EndedEvent from "@/components/EndedEvent"
import { eventState } from "@/lib/eventState"

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
    .select("title, short_description, cover_image_url, city, start_date, status, deleted_at")
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
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const event = await getEvent(slug)

  if (event && eventState(event) === "ended") {
    // Ten sam widok co lista na stronie głównej: tylko opublikowane i jeszcze nie zakończone terminy.
    const { data: upcoming } = await supabase
      .from("published_events_with_next_date")
      .select("id, slug, title, city, next_date, next_start_time")
      .order("next_date", { ascending: true })
      .limit(4)

    return <EndedEvent title={event.title} city={event.city} upcoming={upcoming ?? []} />
  }

  return <EventDetailWrapper slug={slug} />
}
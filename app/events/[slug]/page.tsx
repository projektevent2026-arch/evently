import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import EventDetailWrapper from "@/components/EventDetailWrapper"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params

  const { data: event } = await supabase
    .from("events")
    .select("title, short_description, cover_image_url, city, start_date")
    .eq(/^[0-9a-f-]{36}$/i.test(slug) ? "id" : "slug", slug)
    .single()

  if (!event) {
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

  const description = event.short_description
    || `${date}${event.city ? ` · ${event.city}` : ""}`

  const image = event.cover_image_url
    || "https://evently-silk-omega.vercel.app/og-default.jpg"

  return {
    title: `${event.title} | Evently`,
    description,
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
  return <EventDetailWrapper slug={slug} />
}
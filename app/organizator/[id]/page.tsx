"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { EventCard, type EventData } from "@/components/event-card"
import { ArrowLeft, Building2 } from "lucide-react"

// 2026-09-30: publiczna strona organizatora — "zobacz wszystkie jego
// ogłoszenia" z karty Organizator na stronie wydarzenia. Dane profilu z
// tego samego wąskiego widoku co tam (public_organizer_profiles, BEZ
// phone/role). Lista wydarzeń: published_events_with_next_date
// (ten sam widok co strona główna, więc te same zasady liczenia
// "najbliższego terminu"), filtrowana po created_by — widok już samodzielnie
// pilnuje status=published+deleted_at IS NULL, to jego jedyny cel istnienia.
export default function OrganizatorPage() {
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [events, setEvents] = useState<EventData[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: profile, error: profileError }, { data: rawEvents, error: eventsError }] = await Promise.all([
        supabase
          .from("public_organizer_profiles")
          .select("organization_name, avatar_url")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("published_events_with_next_date")
          .select("id, slug, title, next_date, next_start_time, schedule_type, city, cover_image_url, image_url, category, is_free, created_by")
          .eq("created_by", id)
          .order("next_date", { ascending: true }),
      ])

      // TYMCZASOWY LOG — do usunięcia po znalezieniu przyczyny
      // (2026-09-30, "Nie znaleziono organizatora" mimo że wydarzenie z
      // tym created_by istnieje i jest widoczne publicznie).
      console.log("[ORGANIZATOR DEBUG]", { id, profile, profileError, rawEvents, eventsError })

      // Brak profilu NIE oznacza braku wydarzeń — organizator mógł nigdy
      // nie ustawić nazwy/zdjęcia, a i tak realnie mieć opublikowane
      // wydarzenia. "Nie znaleziono" pokazujemy tylko gdy nie ma ANI
      // profilu, ANI żadnego wydarzenia dla tego id.
      if (!profile && (!rawEvents || rawEvents.length === 0)) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setOrgName(profile?.organization_name || null)
      setAvatarUrl(profile?.avatar_url || null)
      setEvents(
        (rawEvents || []).map((e: any) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          date: e.next_date ? new Date(e.next_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "",
          start_date: e.next_date,
          start_time: e.next_start_time ?? null,
          schedule_type: e.schedule_type,
          city: e.city,
          image: e.cover_image_url || "/images/event-concert.jpg",
          image_url: e.image_url || null,
          interested: 0,
          category: e.category || "Inne",
          price: e.is_free ? "Wstęp wolny" : "Wstęp płatny",
          is_free: e.is_free,
        }))
      )
      setLoading(false)
    }
    if (id) load()
  }, [id])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft size={16} /> Wróć do wydarzeń
        </Link>

        {loading ? (
          <p className="text-muted-foreground">Ładowanie...</p>
        ) : notFound ? (
          <p className="text-muted-foreground">Nie znaleziono organizatora.</p>
        ) : (
          <>
            <div className="mb-8 flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f0fdf4]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Building2 size={28} className="text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{orgName || "Organizator"}</h1>
                <p className="text-sm text-muted-foreground">
                  {events.length} {events.length === 1 ? "wydarzenie" : events.length < 5 ? "wydarzenia" : "wydarzeń"}
                </p>
              </div>
            </div>

            {events.length === 0 ? (
              <p className="text-muted-foreground">Ten organizator nie ma jeszcze opublikowanych wydarzeń.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} initialGoing={false} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
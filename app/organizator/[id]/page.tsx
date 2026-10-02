"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { safeProfileUrl, displayUrl } from "@/lib/safeUrl"
import { EventCard, type EventData } from "@/components/event-card"
import { ArrowLeft, Building2, Globe, MapPin } from "lucide-react"

// 2026-09-30: publiczna strona organizatora — "zobacz wszystkie jego
// ogłoszenia" z karty Organizator na stronie wydarzenia. Dane profilu z
// tego samego wąskiego widoku co tam (public_organizer_profiles, BEZ
// phone/role). Lista wydarzeń: published_events_with_next_date
// (ten sam widok co strona główna, więc te same zasady liczenia
// "najbliższego terminu"), filtrowana po created_by — widok już samodzielnie
// pilnuje status=published+deleted_at IS NULL, to jego jedyny cel istnienia.
//
// 2026-10-02: wersja 1 profilu — zakładki "Wydarzenia" | "O organizatorze".
// Zakładka "O organizatorze" pokazuje się TYLKO gdy organizator wpisał
// cokolwiek (opis, www, Facebook albo Instagram) — pusta zakładka na starcie
// wyglądałaby gorzej niż jej brak. Linki są ponownie walidowane przy
// wyświetlaniu (safeProfileUrl), niezależnie od ograniczeń w bazie.
type OrganizerProfile = {
  organization_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  )
}

export default function OrganizatorPage() {
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [profile, setProfile] = useState<OrganizerProfile | null>(null)
  const [events, setEvents] = useState<EventData[]>([])
  const [tab, setTab] = useState<"events" | "about">("events")

  useEffect(() => {
    async function load() {
      const [{ data: profileData }, { data: rawEvents }] = await Promise.all([
        supabase
          .from("public_organizer_profiles")
          .select("organization_name, avatar_url, bio, city, website_url, facebook_url, instagram_url")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("published_events_with_next_date")
          .select("id, slug, title, next_date, next_start_time, schedule_type, city, cover_image_url, image_url, category, is_free, created_by")
          .eq("created_by", id)
          .order("next_date", { ascending: true }),
      ])

      // Brak profilu NIE oznacza braku wydarzeń — organizator mógł nigdy
      // nie ustawić nazwy/zdjęcia, a i tak realnie mieć opublikowane
      // wydarzenia. "Nie znaleziono" pokazujemy tylko gdy nie ma ANI
      // profilu, ANI żadnego wydarzenia dla tego id.
      if (!profileData && (!rawEvents || rawEvents.length === 0)) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData ? (profileData as OrganizerProfile) : null)
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

  const orgName = profile?.organization_name || null
  const avatarUrl = profile?.avatar_url || null
  const bio = profile?.bio?.trim() || null
  const city = profile?.city?.trim() || null
  const websiteUrl = safeProfileUrl(profile?.website_url, "website")
  const facebookUrl = safeProfileUrl(profile?.facebook_url, "facebook")
  const instagramUrl = safeProfileUrl(profile?.instagram_url, "instagram")
  const hasAbout = !!(bio || websiteUrl || facebookUrl || instagramUrl)
  const activeTab = hasAbout ? tab : "events"

  const tabClass = (active: boolean) =>
    `-mb-px h-12 border-b-2 px-4 text-sm font-semibold transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`

  const iconLinkClass =
    "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-muted"

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
            <div className="mb-6 flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f0fdf4]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Building2 size={28} className="text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-foreground [overflow-wrap:anywhere]">{orgName || "Organizator"}</h1>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {city && (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} aria-hidden="true" /> {city}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>
                    {events.length} {events.length === 1 ? "wydarzenie" : events.length < 5 ? "wydarzenia" : "wydarzeń"}
                  </span>
                </p>
              </div>
            </div>

            {hasAbout && (
              <div role="tablist" className="mb-6 flex gap-2 border-b border-border">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "events"}
                  onClick={() => setTab("events")}
                  className={tabClass(activeTab === "events")}
                >
                  Wydarzenia
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "about"}
                  onClick={() => setTab("about")}
                  className={tabClass(activeTab === "about")}
                >
                  O organizatorze
                </button>
              </div>
            )}

            {activeTab === "about" ? (
              <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5">
                {bio && <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground [overflow-wrap:anywhere]">{bio}</p>}

                {bio && (websiteUrl || facebookUrl || instagramUrl) && <div className="h-px bg-border" />}

                {websiteUrl && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Strona www</span>
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex min-h-11 items-center gap-2 break-all text-right font-semibold text-primary hover:underline"
                    >
                      <Globe size={16} aria-hidden="true" className="shrink-0" />
                      {displayUrl(websiteUrl)}
                    </a>
                  </div>
                )}

                {(facebookUrl || instagramUrl) && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Social media</span>
                    <div className="flex gap-2">
                      {facebookUrl && (
                        <a
                          href={facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          aria-label="Facebook"
                          className={iconLinkClass}
                        >
                          <FacebookIcon />
                        </a>
                      )}
                      {instagramUrl && (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          aria-label="Instagram"
                          className={iconLinkClass}
                        >
                          <InstagramIcon />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : events.length === 0 ? (
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
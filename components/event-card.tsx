"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Heart, Eye } from "lucide-react"
import EventImage from "@/components/EventImage"
import PosterModal from "@/components/PosterModal"
import { useFavorites } from "@/hooks/useFavorites"
import { normalizeCategory, CATEGORY_LABELS, CATEGORY_BADGE_CLASSES as CATEGORY_STYLES } from "@/lib/eventCategory"
import { dateBadgeParts } from "@/lib/eventFormat"

function capitalizeCity(city: string): string {
  if (!city) return ""
  return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
}

export interface EventData {
  id: number
  slug?: string
  title: string
  date: string
  start_date?: string
  start_time?: string | null
  schedule_type?: string
  city: string
  image: string
  image_url?: string | null
  interested: number
  category: string
  price?: string
  initialGoing?: boolean
}

function getDayBadge(start_date?: string, schedule_type?: string): { label: string; color: string } | null {
  if (schedule_type === 'recurring') return { label: "CYKLICZNE", color: "bg-purple-500" }
  if (!start_date) return null
  const now = new Date()
  const event = new Date(start_date)
  const diffDays = Math.floor((event.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (diffDays === 0) return { label: "DZIS", color: "bg-red-500" }
  if (diffDays === 1) return { label: "JUTRO", color: "bg-orange-500" }
  return null
}

// Godzina ze start_time (string 'HH:MM'), NIE z start_date przez new Date
// (to dawało +2h przez strefę czasową).
function getTime(start_time?: string | null): string | null {
  if (!start_time) return null
  return start_time.slice(0, 5)
}

// Krótka data ("7 Wrz") do zawsze widocznego badge'a obok godziny — WCZEŚNIEJ
// karta w ogóle nie pokazywała daty w treści, tylko samą godzinę (widoczne
// np. przy wydarzeniach 2+ tygodnie w przyszłość: "04:00" bez żadnego
// kontekstu, kiedy to jest). Róg zdjęcia ma DZIŚ/JUTRO/CYKLICZNE, ale tylko
// dla tych trzech przypadków — dla reszty nic. dateBadgeParts pochodzi z
// lib/eventFormat.tsx, więc liczy dzień/miesiąc tym samym, sprawdzonym
// mechanizmem co reszta apki (bez błędu strefy czasowej).
function getShortDate(start_date?: string): string | null {
  if (!start_date) return null
  const { day, month } = dateBadgeParts(start_date)
  return `${day} ${month.charAt(0)}${month.slice(1).toLowerCase()}`
}


export function EventCard({ event, initialGoing = false }: { event: EventData; initialGoing?: boolean }) {
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  // Ulubione na localStorage — bez kont. Serce jest zsynchronizowane z detalem i stroną /ulubione.
  const { isFavorite, toggleFavorite } = useFavorites()
  const liked = isFavorite(event.id)

  const dayBadge = getDayBadge(event.start_date, event.schedule_type)
  const dateShort = getShortDate(event.start_date)
  const time = getTime(event.start_time)
  const cat = normalizeCategory(event.category)
  // Plakat ma odwrotny priorytet niż zdjęcie na karcie — najpierw właściwy plakat, potem zdjęcie jako fallback
  const posterImg = event.image_url || event.image

  return (
    <>
      {posterSrc && <PosterModal src={posterSrc} onClose={() => setPosterSrc(null)} />}
      <Link href={`/events/${event.slug || event.id}`} className="block">
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative aspect-[16/10] overflow-hidden">
          <EventImage
            src={event.image}
            alt={event.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          <div className="absolute left-3 top-3">
            <Badge className={`backdrop-blur-sm border-0 font-bold ${CATEGORY_STYLES[cat]}`}>
              {CATEGORY_LABELS[cat]}
            </Badge>
          </div>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(event.id) }}
            aria-label={liked ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              liked ? "bg-red-500 text-white" : "bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
            }`}
          >
            <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          </button>

          <div className="absolute bottom-3 left-3">
            {dayBadge && (
              <span className={`${dayBadge.color} rounded-md px-2 py-0.5 text-xs font-bold text-white`}>
                {dayBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[1.7em] text-base font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary/70" />
            <span>{capitalizeCity(event.city)}</span>
          </div>

          {(dateShort || time || event.price) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {dateShort && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                  {dateShort}
                </span>
              )}
              {time && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                  {time}
                </span>
              )}
              {event.price && (
                <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {event.price}
                </span>
              )}
            </div>
          )}

<div className="mt-auto flex items-center justify-end border-t border-border/50 pt-4 mt-4 min-h-[44px]">
            {/* Licznik „zainteresowanych" (RSVP) UKRYTY — wymaga kont (tier D). */}
            {posterImg && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPosterSrc(posterImg) }}
                className="rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Eye className="size-3.5 mr-1" />
                Plakat
              </Button>
            )}
          </div>
        </div>
      </article>
    </Link>
    </>
  )
}
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Heart, Eye, Calendar, RotateCw } from "lucide-react"
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

// Godzina ze start_time (string 'HH:MM'), NIE z start_date przez new Date
// (to dawało +2h przez strefę czasową).
function getTime(start_time?: string | null): string | null {
  if (!start_time) return null
  return start_time.slice(0, 5)
}

// Krótka data ("7 Wrz") — liczona tym samym mechanizmem co reszta apki
// (lib/eventFormat.tsx), więc bez błędu strefy czasowej.
function getShortDate(start_date?: string): string | null {
  if (!start_date) return null
  const { day, month } = dateBadgeParts(start_date)
  return `${day} ${month.charAt(0)}${month.slice(1).toLowerCase()}`
}

// Plakietka data+godzina NA ZDJĘCIU (nie w treści karty) — to jest sedno
// naprawy: obszar zdjęcia ma stałą wysokość (aspect-[16/10]) niezależnie
// od tego, co się w nim wyświetla, więc długość tekstu plakietki nigdy
// nie wpływa na wysokość całej karty. Wcześniej data/godzina/cena jako
// osobne plakietki w treści łamały się (albo się zawijały wewnątrz, albo
// zawijały do nowej linii), rozciągając kartę.
//
// Kolor = PILNOŚĆ/CHARAKTER czasowy (dziś/jutro/cykliczne/później) —
// CELOWO niezależny od koloru kategorii (Kultura/Sport/...) tuż obok, żeby
// dwa różne znaczenia nie dzieliły tej samej palety kolorów.
type UrgencyBadge = { label: string | null; color: string; icon: "today" | "tomorrow" | "recurring" | "later" }

function getUrgencyBadge(start_date?: string, schedule_type?: string): UrgencyBadge {
  if (schedule_type === 'recurring') return { label: "CYKLICZNE", color: "bg-purple-600", icon: "recurring" }
  if (!start_date) return { label: null, color: "bg-zinc-800", icon: "later" }
  const now = new Date()
  const event = new Date(start_date)
  const diffDays = Math.floor((event.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (diffDays === 0) return { label: "DZISIAJ", color: "bg-red-600", icon: "today" }
  if (diffDays === 1) return { label: "JUTRO", color: "bg-orange-600", icon: "tomorrow" }
  return { label: null, color: "bg-zinc-900/90", icon: "later" }
}


export function EventCard({ event, initialGoing = false }: { event: EventData; initialGoing?: boolean }) {
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  // Ulubione na localStorage — bez kont. Serce jest zsynchronizowane z detalem i stroną /ulubione.
  const { isFavorite, toggleFavorite } = useFavorites()
  const liked = isFavorite(event.id)

  const dateShort = getShortDate(event.start_date)
  const time = getTime(event.start_time)
  const urgency = getUrgencyBadge(event.start_date, event.schedule_type)
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

          {(dateShort || time) && (
            <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 backdrop-blur-sm ${urgency.color}`}>
              {urgency.icon === "recurring" ? (
                <RotateCw className="size-3.5 text-white flex-shrink-0" />
              ) : (
                <Calendar className="size-3.5 text-white flex-shrink-0" />
              )}
              <div className="leading-tight">
                {urgency.label && (
                  <div className="text-[10px] font-black text-white tracking-wide">{urgency.label}</div>
                )}
                <div className={`font-bold text-white whitespace-nowrap ${urgency.label ? "text-[11px]" : "text-xs"}`}>
                  {urgency.icon === "recurring" ? time : [dateShort, time].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[1.7em] text-base font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary/70" />
            <span>{capitalizeCity(event.city)}</span>
          </div>

          {event.price && (
            <div className="mt-2">
              <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                {event.price}
              </span>
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
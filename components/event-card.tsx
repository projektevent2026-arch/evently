"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import EventImage from "@/components/EventImage"

const CATEGORY_LABELS: Record<string, string> = {
  festyny: "Festyny", kultura: "Kultura", muzyka: "Muzyka", sport: "Sport",
}

const CATEGORY_STYLES: Record<string, string> = {
  festyny: "bg-amber-500 text-black",
  kultura: "bg-purple-500 text-white",
  muzyka: "bg-green-500 text-black",
  sport: "bg-blue-500 text-white",
}

function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw ?? "").toLowerCase().trim()
  if (c === "kultura" || c === "culture") return "kultura"
  if (c === "muzyka" || c === "music") return "muzyka"
  if (c === "sport") return "sport"
  // festyny, folk, family, rodzinne i wszystko nierozpoznane → festyny (rdzeń kategorii)
  return "festyny"
}

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
  city: string
  image: string
  interested: number
  category: string
  price?: string
  initialGoing?: boolean
}

function getDayBadge(start_date?: string): { label: string; color: string } | null {
  if (!start_date) return null
  const now = new Date()
  const event = new Date(start_date)
  const diffDays = Math.floor((event.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (diffDays === 0) return { label: "DZIS", color: "bg-red-500" }
  if (diffDays === 1) return { label: "JUTRO", color: "bg-orange-500" }
  return null
}

function getTime(start_date?: string): string | null {
  if (!start_date) return null
  return new Date(start_date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
}

export function EventCard({ event, initialGoing = false }: { event: EventData; initialGoing?: boolean }) {
  const [going, setGoing] = useState(initialGoing)
  const [liked, setLiked] = useState(false)
  const [interestedCount, setInterestedCount] = useState(event.interested)

  const dayBadge = getDayBadge(event.start_date)
  const time = getTime(event.start_date)
  const cat = normalizeCategory(event.category)

  const handleGoing = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = "/login"; return }
    const userId = session.user.id
    const eventId = event.id

    if (going) {
      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId)
      if (!error) {
        setGoing(false)
        setInterestedCount((prev) => prev - 1)
      }
    } else {
      const { error } = await supabase
        .from("event_attendees")
        .insert({ user_id: userId, event_id: eventId })
      if (!error) {
        setGoing(true)
        setInterestedCount((prev) => prev + 1)
      }
    }
  }

  return (
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked) }}
            className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              liked ? "bg-red-500 text-white" : "bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
            }`}
          >
            <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          </button>

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {dayBadge && (
              <span className={`${dayBadge.color} rounded-md px-2 py-0.5 text-xs font-bold text-white`}>
                {dayBadge.label}
              </span>
            )}
            {time && (
              <span className="rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                {time}
              </span>
            )}
          </div>

          {event.price && (
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {event.price}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary/70" />
            <span>{capitalizeCity(event.city)}</span>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4 mt-4">
            {interestedCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span className="font-medium">{interestedCount}</span>
                <span>zainteresowanych</span>
              </div>
            ) : (
              <div />
            )}
            <Button
              size="sm"
              variant={going ? "default" : "outline"}
              onClick={handleGoing}
              className={`rounded-lg text-xs font-semibold ${going ? "" : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"}`}
            >
              {going ? "Ide!" : "Ide"}
            </Button>
          </div>
        </div>
      </article>
    </Link>
  )
}
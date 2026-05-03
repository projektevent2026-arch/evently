"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, Users, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"

export interface EventData {
  id: number
  slug?: string  
  title: string
  date: string
  city: string
  image: string
  interested: number
  category: string
  price?: string
}

export function EventCard({ event }: { event: EventData }) {
  const [going, setGoing] = useState(false)
  const [liked, setLiked] = useState(false)
  const [interestedCount, setInterestedCount] = useState(event.interested)

  const handleGoing = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      window.location.href = "/login"
      return
    }

    const userId = session.user.id
    const eventId = event.id

    if (going) {
      await supabase
        .from("event_attendees")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId)
      setGoing(false)
      setInterestedCount((prev) => prev - 1)
    } else {
      await supabase
        .from("event_attendees")
        .insert({ user_id: userId, event_id: eventId })
      setGoing(true)
      setInterestedCount((prev) => prev + 1)
    }
  }

  return (
    <Link href={`/events/${event.slug || event.id}`} className="block">
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative aspect-[16/10] overflow-hidden">
        <img
  src={event.image}
  alt={event.title}
  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <div className="absolute left-3 top-3">
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
              {event.category}
            </Badge>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setLiked(!liked)
            }}
            className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              liked
                ? "bg-red-500 text-white"
                : "bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
            }`}
            aria-label={liked ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          >
            <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          </button>

          {event.price && (
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {event.price}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">      
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>

          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 text-primary/70" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-primary/70" />
              <span>{event.city}</span>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span className="font-medium">{interestedCount}</span>
              <span>zainteresowanych</span>
            </div>

            <Button
              size="sm"
              variant={going ? "default" : "outline"}
              onClick={handleGoing}
              className={`rounded-lg text-xs font-semibold ${going ? "" : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"}`}
            >
              {going ? "Idę!" : "Idę"}
            </Button>
          </div>
        </div>
      </article>
    </Link>
  )
}
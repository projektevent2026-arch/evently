"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Calendar, MapPin, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function EventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [going, setGoing] = useState(false)
  const [interestedCount, setInterestedCount] = useState(0)

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()

      if (!error) {
        setEvent(data)
        setInterestedCount(data.interested_count || 0)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [slug])

  const handleGoing = async () => {
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Ładowanie...</p>
    </div>
  )

  if (!event) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Nie znaleziono wydarzenia.</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-background">
      {/* Hero zdjęcie */}
      <div className="relative h-72 w-full sm:h-96">
        <Image
          src={event.image || "/images/event-concert.jpg"}
          alt={event.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute left-4 top-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ArrowLeft size={16} /> Wróć
          </Link>
        </div>
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-primary/90 text-primary-foreground">
            {event.category}
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Tytuł i przycisk */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {event.title}
          </h1>
          <Button
            variant={going ? "default" : "outline"}
            onClick={handleGoing}
            className="shrink-0"
          >
            {going ? "Idę! ✓" : "Idę"}
          </Button>
        </div>

        {/* Zainteresowani */}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users size={14} />
          <span>{interestedCount} zainteresowanych</span>
        </div>

        {/* Data i miejsce */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Calendar size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {new Date(event.start_date).toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-muted-foreground">
                {new Date(event.start_date).toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <MapPin size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{event.location || event.city}</p>
              <p className="text-muted-foreground">{event.city}</p>
            </div>
          </div>
        </div>

        {/* Opis */}
        {event.description && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">O wydarzeniu</h2>
            <p className="leading-relaxed text-muted-foreground">{event.description}</p>
          </div>
        )}
      </div>
    </main>
  )
}
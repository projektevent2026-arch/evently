"use client"

import { useState } from "react"
import { Calendar, MapPin, Users, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Event {
  id: number
  title: string
  date: string
  time: string
  city: string
  venue: string
  image: string
  interested: number
  category: string
}

const events: Event[] = [
  {
    id: 1,
    title: "Letni Festiwal Muzyki Elektronicznej",
    date: "15 mar 2026",
    time: "20:00",
    city: "Warszawa",
    venue: "Stadion Narodowy",
    image: "/images/event-concert.jpg",
    interested: 1243,
    category: "Muzyka",
  },
  {
    id: 2,
    title: "Festiwal Street Food",
    date: "22 mar 2026",
    time: "12:00",
    city: "Kraków",
    venue: "Plac Wolnica",
    image: "/images/event-food.jpg",
    interested: 876,
    category: "Jedzenie",
  },
  {
    id: 3,
    title: "Noc Muzeów 2026",
    date: "18 maj 2026",
    time: "18:00",
    city: "Wrocław",
    venue: "Centrum Kultury",
    image: "/images/event-culture.jpg",
    interested: 2105,
    category: "Kultura",
  },
  {
    id: 4,
    title: "Maraton Poznański",
    date: "5 kwi 2026",
    time: "09:00",
    city: "Poznań",
    venue: "Stary Rynek",
    image: "/images/event-sport.jpg",
    interested: 534,
    category: "Sport",
  },
]

function EventCard({ event }: { event: Event }) {
  const [going, setGoing] = useState(false)
  const [liked, setLiked] = useState(false)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />

        {/* Category badge */}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
          {event.category}
        </span>

        {/* Like button */}
        <button
          onClick={() => setLiked(!liked)}
          aria-label={liked ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-colors hover:bg-card"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              liked ? "fill-primary text-primary" : "text-foreground/60"
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <Calendar className="h-4 w-4" />
          <span>
            {event.date} &middot; {event.time}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-card-foreground line-clamp-2">
          {event.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{event.interested.toLocaleString("pl-PL")} zainteresowanych</span>
          </div>
          <Button
            size="sm"
            onClick={() => setGoing(!going)}
            className={`rounded-full px-5 text-sm font-semibold transition-all ${
              going
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {going ? "Idę!" : "Idę"}
          </Button>
        </div>
      </div>
    </article>
  )
}

export function EventGrid() {
  return (
    <section id="discover" className="mx-auto max-w-7xl px-6 pb-20">
      {/* Section header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground md:text-3xl">
            Popularne wydarzenia
          </h2>
          <p className="mt-1 text-muted-foreground">
            Najciekawsze wydarzenia w najbliższym czasie
          </p>
        </div>
        <a
          href="#"
          className="hidden text-sm font-semibold text-primary transition-colors hover:text-primary/80 sm:block"
        >
          Zobacz wszystkie &rarr;
        </a>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Mobile CTA */}
      <div className="mt-8 text-center sm:hidden">
        <a
          href="#"
          className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Zobacz wszystkie wydarzenia &rarr;
        </a>
      </div>
    </section>
  )
}

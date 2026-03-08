import { EventCard, type EventData } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const events: EventData[] = [
  {
    id: 1,
    title: "Open'er Festival 2026 - Letnia scena główna",
    date: "28 czerwca 2026, 18:00",
    city: "Gdynia, Kosakowo",
    image: "/images/event-concert.jpg",
    interested: 3842,
    category: "Muzyka",
    price: "od 299 zł",
  },
  {
    id: 2,
    title: "Warszawski Festiwal Street Foodu",
    date: "15 marca 2026, 12:00",
    city: "Warszawa, Powiśle",
    image: "/images/event-food.jpg",
    interested: 1256,
    category: "Jedzenie",
    price: "Wstęp wolny",
  },
  {
    id: 3,
    title: "Noc Muzeów - Sztuka współczesna w MNK",
    date: "18 maja 2026, 19:00",
    city: "Kraków, Stare Miasto",
    image: "/images/event-culture.jpg",
    interested: 2198,
    category: "Kultura",
    price: "od 25 zł",
  },
  {
    id: 4,
    title: "Night Run Poznań - Bieg nocny 10km",
    date: "22 marca 2026, 21:00",
    city: "Poznań, Centrum",
    image: "/images/event-sport.jpg",
    interested: 876,
    category: "Sport",
    price: "od 60 zł",
  },
]

export function EventsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8" id="discover">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Popularne wydarzenia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wybrane dla Ciebie na podstawie lokalizacji i zainteresowań
          </p>
        </div>
        <Button variant="ghost" className="hidden gap-2 text-sm font-medium text-primary hover:text-primary/80 sm:flex">
          Zobacz wszystkie
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <Button variant="outline" className="gap-2 text-sm font-medium text-primary">
          Zobacz wszystkie
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { EventCard, type EventData } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["culture", "music", "food", "sport", "family", "technology"]
const CATEGORY_LABELS: Record<string, string> = {
  culture: "Kultura", music: "Muzyka", food: "Jedzenie",
  sport: "Sport", family: "Rodzinne", technology: "Technologia",
}

function getDateRange(time: string | null): { from?: string; to?: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (time === "dzis") {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
  }
  if (time === "jutro") {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2)
    return { from: tomorrow.toISOString(), to: dayAfter.toISOString() }
  }
  if (time === "weekend") {
    const day = today.getDay()
    const daysToSat = day === 6 ? 0 : (6 - day)
    const sat = new Date(today); sat.setDate(sat.getDate() + daysToSat)
    const mon = new Date(sat); mon.setDate(mon.getDate() + 2)
    return { from: sat.toISOString(), to: mon.toISOString() }
  }
  return {}
}

export function EventsGrid() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventData[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const q = searchParams.get("q") || ""
  const time = searchParams.get("time")
  const isFree = time === "bezplatne"

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: true })

      // Filtr czasowy
      const { from, to } = getDateRange(isFree ? null : time)
      if (from) query = query.gte("start_date", from)
      if (to) query = query.lt("start_date", to)

      // Filtr bezpłatne
      if (isFree) query = query.eq("is_free", true)

      const { data, error } = await query

      if (error) { console.error(error); setLoading(false); return }

      const mapped = (data || []).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        date: e.start_date ? new Date(e.start_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
        start_date: e.start_date,
        city: e.city,
        image: e.cover_image_url || "/images/event-concert.jpg",
        interested: e.interested_count || 0,
        category: e.category || "Inne",
        price: e.is_free ? "Wstęp wolny" : e.price_from ? `od ${e.price_from} zł` : "Wstęp wolny",
      }))

      setEvents(mapped)
      setLoading(false)
    }

    fetchEvents()
  }, [time, isFree])

  // Filtrowanie po tekście i kategorii (client-side)
  const filtered = events.filter((e) => {
    const matchQ = q
      ? e.title.toLowerCase().includes(q.toLowerCase()) ||
        e.city?.toLowerCase().includes(q.toLowerCase())
      : true
    const matchCat = activeCategory ? e.category === activeCategory : true
    return matchQ && matchCat
  })

  return (
    <section className="pb-8" id="discover">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {q ? `Wyniki dla "${q}"` : "Popularne wydarzenia"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "wydarzenie" : filtered.length < 5 ? "wydarzenia" : "wydarzeń"}
          </p>
        </div>
        <Button variant="ghost" className="hidden gap-2 text-sm font-medium text-primary hover:text-primary">
          Zobacz wszystkie <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-col
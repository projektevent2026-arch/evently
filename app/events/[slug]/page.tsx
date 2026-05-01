"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Calendar, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()

      if (!error) setEvent(data)
      setLoading(false)
    }
    fetchEvent()
  }, [slug])

  if (loading) return <p style={{ padding: "2rem" }}>Ładowanie...</p>
  if (!event) return <p style={{ padding: "2rem" }}>Nie znaleziono wydarzenia.</p>

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a", marginBottom: "1.5rem" }}>
        <ArrowLeft size={16} /> Wróć do listy
      </Link>
      <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem" }}>
        {event.category}
      </span>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "1rem" }}>{event.title}</h1>
      <div style={{ display: "flex", gap: "1.5rem", margin: "1rem 0", color: "#6b7280" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Calendar size={16} />
          {new Date(event.start_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={16} />
          {event.city}
        </span>
      </div>
      <p style={{ lineHeight: "1.75", color: "#374151", marginTop: "1.5rem" }}>{event.description}</p>
    </main>
  )
}
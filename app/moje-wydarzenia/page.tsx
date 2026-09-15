"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"

// Prosta lista własnych wydarzeń organizatora, z możliwością edycji
// i usuwania. Middleware już wymaga zalogowania przed wejściem tutaj —
// filtr po created_by (i RLS po stronie bazy — właściciel albo
// admin/moderator) pilnuje, że każdy widzi i usuwa wyłącznie swoje.
export default function MojeWydarzenia() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("events")
        .select("id, slug, title, start_date, status")
        .eq("created_by", user.id)
        .order("start_date", { ascending: false })

      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "—"

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(`Na pewno usunąć „${title}"? Tej operacji nie można cofnąć.`)
    if (!confirmed) return

    setDeleteError(null)
    setDeletingId(id)

    // Najpierw terminy (event_dates), tak samo jak przy edycji w
    // dodaj-wydarzenie/page.tsx — event nie ma kaskadowego usuwania
    // wymuszonego w kodzie, więc robimy to jawnie, w tej kolejności.
    const { error: datesError } = await supabase.from("event_dates").delete().eq("event_id", id)
    if (datesError) {
      setDeleteError("Nie udało się usunąć: " + datesError.message)
      setDeletingId(null)
      return
    }

    const { error: eventError } = await supabase.from("events").delete().eq("id", id)
    if (eventError) {
      setDeleteError("Nie udało się usunąć: " + eventError.message)
      setDeletingId(null)
      return
    }

    setEvents(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "sans-serif" }}>
      <header style={{ background: "#141414", borderBottom: "1px solid #262626", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
        </Link>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Moje wydarzenia</span>
      </header>

      <div style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Moje wydarzenia</h1>
          <Link href="/dodaj-wydarzenie" style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "white", borderRadius: 10, padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
            <Plus size={16} /> Dodaj wydarzenie
          </Link>
        </div>

        {deleteError && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}>{deleteError}</p>
        )}

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6b7280" }}>
            Nie masz jeszcze żadnych wydarzeń.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map(event => (
              <div key={event.id} style={{ background: "#161616", border: "1px solid #262626", borderRadius: 12, padding: "1rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    📅 {fmtDate(event.start_date)} · {event.status === "published" ? "Opublikowane" : event.status}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/dodaj-wydarzenie?edit=${event.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #333", color: "white", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <Pencil size={14} /> Edytuj
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id, event.title)}
                    disabled={deletingId === event.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #7f1d1d", color: "#ef4444", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: deletingId === event.id ? "not-allowed" : "pointer", opacity: deletingId === event.id ? 0.6 : 1 }}
                  >
                    <Trash2 size={14} /> {deletingId === event.id ? "Usuwanie..." : "Usuń"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
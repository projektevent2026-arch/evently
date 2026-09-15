"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, MapPin } from "lucide-react"

// Profil pojedynczego użytkownika widziany oczami admina — na razie tylko
// e-mail + rola (nazwa organizacji, np. "Suwalski Ośrodek Kultury",
// zostaje na później, gdy dojdzie kolumna w profiles) i lista wszystkich
// jego wydarzeń, niezależnie od statusu. Chroniona tak samo jak reszta
// /admin/* — przez middleware (wymóg roli admin/moderator) + RLS na
// odczyt events (admin/moderator widzi wszystko, nie tylko published).
const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "#6b7280", bg: "#f3f4f6" },
  moderator: { label: "Moderator", color: "#0891b2", bg: "#ecfeff" },
  organizer: { label: "Organizator", color: "#7c3aed", bg: "#f5f3ff" },
  user: { label: "Użytkownik", color: "#9ca3af", bg: "#f9fafb" },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Opublikowane", color: "#16a34a", bg: "#f0fdf4" },
  pending: { label: "Oczekujące", color: "#b45309", bg: "#fffbeb" },
  draft: { label: "Szkic", color: "#6b7280", bg: "#f3f4f6" },
  archived: { label: "Archiwum", color: "#9ca3af", bg: "#f9fafb" },
}

export default function OrganizatorProfile() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        // Ten sam endpoint co lista Użytkownicy — filtr po id po stronie klienta.
        const usersRes = await fetch("/api/admin/users")
        const usersData = await usersRes.json()
        if (!usersRes.ok) throw new Error(usersData.error || "Błąd pobierania użytkownika")
        const match = (usersData.users || []).find((u: any) => u.id === id)
        if (match) {
          setEmail(match.email)
          setRole(match.role)
        }

        const { data, error: eventsError } = await supabase
          .from("events")
          .select("id, title, start_date, status, cover_image_url, image_url")
          .eq("created_by", id)
          .order("start_date", { ascending: false })

        if (eventsError) throw eventsError
        setEvents(data || [])
      } catch (e: any) {
        setError(e.message)
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "—"

  const roleInfo = role ? (ROLE_LABELS[role] || ROLE_LABELS.user) : null

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={16} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
      </header>

      <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1.5rem" }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.85rem", marginBottom: "1.5rem", padding: 0 }}
        >
          <ArrowLeft size={16} /> Wróć
        </button>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : error ? (
          <p style={{ color: "#ef4444" }}>{error}</p>
        ) : (
          <>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px", color: "#111827" }}>
              {email || "Nieznany użytkownik"}
            </h1>
            {roleInfo && (
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: roleInfo.bg, color: roleInfo.color, marginBottom: "1.5rem" }}>
                {roleInfo.label}
              </span>
            )}

            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginTop: "1.5rem", marginBottom: "0.75rem", color: "#111827" }}>
              Wydarzenia ({events.length})
            </h2>

            {events.length === 0 ? (
              <p style={{ color: "#6b7280" }}>Brak wydarzeń tego użytkownika.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {events.map(event => {
                  const status = STATUS_LABELS[event.status]
                  return (
                    <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1rem", background: "white", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                      {event.cover_image_url || event.image_url ? (
                        <img
                          src={event.cover_image_url || event.image_url}
                          alt=""
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#f3f4f6" }}
                        />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f3f4f6", flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {event.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{fmtDate(event.start_date)}</div>
                      </div>
                      {status && (
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: status.bg, color: status.color, flexShrink: 0 }}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
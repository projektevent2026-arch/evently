"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, MapPin, Trash2, Edit, Copy, Check, X } from "lucide-react"

// Sprowadza dowolną (także starą/legacy) kategorię z bazy do 4 docelowych
function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw ?? "").toLowerCase().trim()
  if (c === "kultura" || c === "culture") return "kultura"
  if (c === "muzyka" || c === "music") return "muzyka"
  if (c === "sport") return "sport"
  if (c === "festyny" || c === "festiwal") return "festyny"
  if (!c) return ""
  return "festyny"
}

const CAT_PILLS = [
  { id: "all", label: "Wszystkie" },
  { id: "festyny", label: "🎪 Festyny" },
  { id: "kultura", label: "🎭 Kultura" },
  { id: "muzyka", label: "🎵 Muzyka" },
  { id: "sport", label: "⚽ Sport" },
]
const CAT_LABEL: Record<string, string> = {
  festyny: "🎪 Festyny", kultura: "🎭 Kultura", muzyka: "🎵 Muzyka", sport: "⚽ Sport",
}
const CAT_COLOR: Record<string, string> = {
  festyny: "#f59e0b", kultura: "#7c3aed", muzyka: "#16a34a", sport: "#2563eb",
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Opublikowane", color: "#16a34a", bg: "#f0fdf4" },
  pending:   { label: "Oczekujące",   color: "#b45309", bg: "#fffbeb" },
  draft:     { label: "Szkic",        color: "#6b7280", bg: "#f3f4f6" },
  archived:  { label: "Archiwum",     color: "#9ca3af", bg: "#f9fafb" },
}

export default function AdminPage() {
  const [events, setEvents] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [catFilter, setCatFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("date_desc")

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from("events").select("*").order("start_date", { ascending: false })
    setEvents(data || [])
  }

  const handleEdit = (event: any) => { window.location.href = `/admin/wydarzenia?id=${event.id}` }

  const handleApprove = async (id: string) => {
    await supabase.from("events").update({ status: "published" }).eq("id", id)
    fetchEvents()
  }
  const handleReject = async (id: string) => {
    if (!confirm("Odrzucić i usunąć to zgłoszenie?")) return
    await supabase.from("events").delete().eq("id", id)
    fetchEvents()
  }
  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć wydarzenie?")) return
    await supabase.from("events").delete().eq("id", id)
    fetchEvents()
  }
  const handleDuplicate = async (event: any) => {
    const { id, created_at, ...rest } = event
    const copy = {
      ...rest,
      title: (event.title || "") + " (kopia)",
      slug: (event.slug || "") + "-kopia-" + Date.now(),
      status: "draft",
    }
    const { error } = await supabase.from("events").insert([copy])
    if (error) { alert("Błąd kopiowania: " + error.message); return }
    fetchEvents()
  }

  const norm = (s: string) =>
    s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  const filtered = events
    .filter(e => filterStatus === "all" || e.status === filterStatus)
    .filter(e => catFilter === "all" || normalizeCategory(e.category) === catFilter)
    .filter(e => {
      const q = norm(search.trim())
      if (!q) return true
      const hay = norm([e.title, e.city, e.venue_name, e.organizer_name].filter(Boolean).join(" "))
      return q.split(/\s+/).every(w => hay.includes(w))
    })
    .sort((a, b) => {
      if (sortBy === "date_asc") return (a.start_date || "").localeCompare(b.start_date || "")
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "", "pl")
      if (sortBy === "newest") return (b.created_at || "").localeCompare(a.created_at || "")
      return (b.start_date || "").localeCompare(a.start_date || "")
    })

  const counts = {
    all: events.length,
    pending: events.filter(e => e.status === "pending").length,
    published: events.filter(e => e.status === "published").length,
    draft: events.filter(e => e.status === "draft").length,
    archived: events.filter(e => e.status === "archived").length,
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "—"

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f6f8fa" }}>
      <style>{`
        @media (max-width: 1100px) {
          html, body { overflow-x: hidden; }
          .admin-sidebar { display: none !important; }
          .admin-list-main { padding: 0 !important; padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
          .admin-list-head { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .admin-add-btn { justify-content: center !important; width: 100% !important; }
          .admin-list-pad { padding: 14px 16px !important; }
        }
      `}</style>

      {/* LEWE MENU — chowane na telefonie */}
      <aside className="admin-sidebar" style={{ width: 220, background: "white", borderRight: "1px solid #e5e7eb", padding: "1.5rem 1rem", flexDirection: "column", gap: "0.5rem", display: "flex" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
        </div>
        <a href="/" style={navItem(false)}>Panel główny</a>
        <a href="/admin" style={navItem(true)}>Wydarzenia</a>
        <a href="/admin/wydarzenia" style={navItem(false)}>Dodaj wydarzenie</a>
      </aside>

      {/* LISTA */}
      <main className="admin-list-main" style={{ flex: 1, padding: "1.5rem", minWidth: 0 }}>

        {/* Nagłówek */}
        <div className="admin-list-pad">
          <div className="admin-list-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: "1.25rem" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Wydarzenia</h1>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "4px 0 0" }}>Zarządzaj wszystkimi wydarzeniami</p>
            </div>
            <a href="/admin/wydarzenia" className="admin-add-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "white", borderRadius: 10, padding: "0.75rem 1.1rem", fontWeight: 600, fontSize: "0.95rem", textDecoration: "none", whiteSpace: "nowrap" }}>
              <Plus size={18} /> Dodaj wydarzenie
            </a>
          </div>

          {/* Zakładki statusu */}
          <div style={{ display: "flex", gap: "1.25rem", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", overflowX: "auto", scrollbarWidth: "none" }}>
            {(["all", "pending", "published", "draft", "archived"] as const).map(val => (
              <button key={val} onClick={() => setFilterStatus(val)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", whiteSpace: "nowrap",
                fontWeight: filterStatus === val ? 600 : 400,
                color: filterStatus === val ? "#16a34a" : "#6b7280",
                borderBottom: filterStatus === val ? "2px solid #16a34a" : "2px solid transparent",
                paddingBottom: "0.6rem",
              }}>
                {val === "all" ? "Wszystkie" : val === "pending" ? "Oczekujące" : val === "published" ? "Opublikowane" : val === "draft" ? "Szkice" : "Archiwum"}
                {" "}<span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{counts[val]}</span>
              </button>
            ))}
          </div>

          {/* Pigułki kategorii */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
            {CAT_PILLS.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 999, whiteSpace: "nowrap",
                border: "1px solid", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit",
                background: catFilter === c.id ? "#16a34a" : "white",
                color: catFilter === c.id ? "white" : "#374151",
                borderColor: catFilter === c.id ? "#16a34a" : "#e5e7eb",
                fontWeight: catFilter === c.id ? 600 : 400,
              }}>{c.label}</button>
            ))}
          </div>

          {/* Szukaj + sortowanie */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Szukaj po nazwie, mieście, organizatorze..."
                style={{ padding: "0.7rem 2rem 0.7rem 0.85rem", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: "0.9rem", width: "100%", boxSizing: "border-box", outline: "none", background: "white", color: "#111827" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
              )}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "0.7rem 0.85rem", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: "0.9rem", background: "white", color: "#111827", cursor: "pointer" }}>
              <option value="date_desc">Data: od najnowszych</option>
              <option value="date_asc">Data: od najstarszych</option>
              <option value="newest">Ostatnio dodane</option>
              <option value="title">Nazwa A-Z</option>
            </select>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 12px" }}>{filtered.length} z {events.length}</p>
        </div>

        {/* KARTY */}
        <div className="admin-list-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(event => {
            const cat = normalizeCategory(event.category)
            const st = STATUS_LABELS[event.status]
            return (
              <div key={event.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "flex", gap: 12 }}>
                <img src={event.cover_image_url || event.image_url || "/images/event-concert.jpg"} alt=""
                  style={{ width: 60, height: 78, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#f3f4f6" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.98rem", lineHeight: 1.3, marginBottom: 4, color: "#111827" }}>{event.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {event.address || event.city || "—"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 8 }}>📅 {fmtDate(event.start_date)}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: st?.bg || "#f3f4f6", color: st?.color || "#6b7280" }}>
                      {st?.label || event.status}
                    </span>
                    {cat && (
                      <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: CAT_COLOR[cat], color: "white" }}>
                        {CAT_LABEL[cat]}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {event.status === "pending" && <>
                      <button onClick={() => handleApprove(event.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                        <Check size={14} /> Zatwierdź
                      </button>
                      <button onClick={() => handleReject(event.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                        <X size={14} /> Odrzuć
                      </button>
                    </>}
                    <button onClick={() => handleEdit(event)} title="Edytuj" style={actBtn}><Edit size={16} /></button>
                    <button onClick={() => handleDuplicate(event)} title="Duplikuj" style={actBtn}><Copy size={16} /></button>
                    <button onClick={() => handleDelete(event.id)} title="Usuń" style={{ ...actBtn, color: "#ef4444" }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>Brak wydarzeń</div>
          )}
        </div>
      </main>
    </div>
  )
}

const navItem = (active: boolean): React.CSSProperties => ({
  padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.9rem",
  background: active ? "#f0fdf4" : "transparent",
  color: active ? "#16a34a" : "#374151",
  fontWeight: active ? 600 : 400,
  cursor: "pointer", textDecoration: "none", display: "block",
})
const actBtn: React.CSSProperties = {
  width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #e5e7eb", borderRadius: 8, background: "white", color: "#6b7280", cursor: "pointer",
}
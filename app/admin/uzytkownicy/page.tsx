"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin:      { label: "Admin",       color: "#6b7280", bg: "#f3f4f6" },
  moderator:  { label: "Moderator",   color: "#0891b2", bg: "#ecfeff" },
  organizer:  { label: "Organizator", color: "#7c3aed", bg: "#f5f3ff" },
  user:       { label: "Użytkownik",  color: "#9ca3af", bg: "#f9fafb" },
}

interface UserRow {
  id: string
  email: string
  role: string
  created_at: string
}

export default function AdminUzytkownicy() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Błąd pobierania")
      setUsers(data.users)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (id: string) => {
    const role = pendingRole[id]
    if (!role) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Błąd zapisu")
      await load()
      setPendingRole(prev => { const next = { ...prev }; delete next[id]; return next })
    } catch (e: any) {
      alert("Nie udało się zapisać: " + e.message)
    }
    setSavingId(null)
  }

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }) : "—"

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f6f8fa" }}>
      <aside style={{ width: 220, background: "white", borderRight: "1px solid #e5e7eb", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
        </div>
        <a href="/" style={{ padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.9rem", color: "#374151", textDecoration: "none" }}>Panel główny</a>
        <a href="/admin" style={{ padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.9rem", color: "#374151", textDecoration: "none" }}>Wydarzenia</a>
        <a href="/admin/uzytkownicy" style={{ padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.9rem", background: "#f0fdf4", color: "#16a34a", fontWeight: 600, textDecoration: "none" }}>Użytkownicy</a>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem", minWidth: 0 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px", color: "#111827" }}>Użytkownicy</h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>E-mail i rola w jednym miejscu, bez przełączania się między zakładkami Supabase.</p>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : error ? (
          <p style={{ color: "#ef4444" }}>{error}</p>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            {users.map(u => {
              const current = ROLE_LABELS[u.role] || ROLE_LABELS.user
              const editing = pendingRole[u.id] !== undefined
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/admin/organizator/${u.id}`}
                      style={{ fontSize: "0.9rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {u.email}
                    </Link>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Dołączył {fmtDate(u.created_at)}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: current.bg, color: current.color, flexShrink: 0 }}>
                    {current.label}
                  </span>
                  <select
                    value={pendingRole[u.id] ?? u.role}
                    onChange={e => setPendingRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.8rem", background: "white", color: "#111827" }}
                  >
                    <option value="user">Użytkownik</option>
                    <option value="organizer">Organizator</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleSave(u.id)}
                    disabled={!editing || savingId === u.id}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: editing ? "#16a34a" : "#e5e7eb", color: editing ? "white" : "#9ca3af", fontSize: "0.8rem", fontWeight: 600, cursor: editing ? "pointer" : "default", flexShrink: 0 }}
                  >
                    {savingId === u.id ? "Zapisywanie..." : "Zapisz"}
                  </button>
                </div>
              )
            })}
            {users.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>Brak użytkowników</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, MapPin, Calendar, Edit, Trash2 } from "lucide-react"

const CATEGORIES = ["culture","music","food","sport","family","technology"]
const CATEGORY_LABELS: Record<string, string> = {
  culture:"Kultura", music:"Muzyka", food:"Jedzenie",
  sport:"Sport", family:"Rodzinne", technology:"Technologia"
}

const emptyForm = {
  title: "", slug: "", description: "", short_description: "",
  start_date: "", end_date: "",
  city: "", address: "", venue_name: "",
  category: "culture",
  cover_image_url: "", ticket_url: "", website_url: "",
  organizer_name: "",
  price_from: "0", is_free: true,
  latitude: "", longitude: "",
  status: "published",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  published: { label: "Opublikowane", color: "#16a34a" },
  draft: { label: "Szkic", color: "#6b7280" },
  archived: { label: "Archiwum", color: "#9ca3af" },
}

export default function AdminPage() {
  const [events, setEvents] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [statusMsg, setStatusMsg] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from("events").select("*").order("start_date", { ascending: false })
    setEvents(data || [])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "title" ? {
        slug: value.toLowerCase()
          .replace(/ą/g,"a").replace(/ę/g,"e").replace(/ó/g,"o")
          .replace(/ś/g,"s").replace(/ł/g,"l").replace(/ż/g,"z")
          .replace(/ź/g,"z").replace(/ć/g,"c").replace(/ń/g,"n")
          .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      } : {}),
      ...(name === "is_free" && checked ? { price_from: "0" } : {}),
    }))
  }

  const handleGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(", ")
    if (!query) return
    setGeocoding(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      const data = await res.json()
      if (data[0]) {
        setForm((prev) => ({ ...prev, latitude: parseFloat(data[0].lat).toFixed(6), longitude: parseFloat(data[0].lon).toFixed(6) }))
      }
    } catch {}
    setGeocoding(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg("Zapisywanie...")
    const payload = {
      title: form.title, slug: form.slug,
      description: form.description || null,
      short_description: form.short_description || null,
      start_date: form.start_date, end_date: form.end_date || null,
      city: form.city, address: form.address || null,
      venue_name: form.venue_name || null,
      category: form.category,
      cover_image_url: form.cover_image_url || null,
      ticket_url: form.ticket_url || null,
      website_url: form.website_url || null,
      organizer_name: form.organizer_name || null,
      is_free: form.is_free,
      price_from: form.is_free ? null : (parseFloat(form.price_from) || null),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      status: form.status,
    }
    const { error } = await supabase.from("events").insert([payload])
    if (error) {
      setStatusMsg("Błąd: " + error.message)
    } else {
      setStatusMsg("Wydarzenie dodane!")
      setForm(emptyForm)
      setShowForm(false)
      fetchEvents()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć wydarzenie?")) return
    await supabase.from("events").delete().eq("id", id)
    fetchEvents()
  }

  const filtered = filterStatus === "all" ? events : events.filter(e => e.status === filterStatus)

  const counts = {
    all: events.length,
    published: events.filter(e => e.status === "published").length,
    draft: events.filter(e => e.status === "draft").length,
    archived: events.filter(e => e.status === "archived").length,
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", background: "#f9fafb" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", background: "white", borderRight: "1px solid #e5e7eb", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
        </div>
        {[
          { label: "Panel główny", href: "/" },
          { label: "Wydarzenia", href: "/admin", active: true },
          { label: "Dodaj wydarzenie", onClick: () => { setShowForm(true); setForm(emptyForm) } },
        ].map((item, i) => (
          
            key={i}
            href={item.href || "#"}
            onClick={item.onClick ? (e) => { e.preventDefault(); item.onClick!() } : undefined}
            style={{
              padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.9rem",
              background: item.active ? "#f0fdf4" : "transparent",
              color: item.active ? "#16a34a" : "#374151",
              fontWeight: item.active ? 600 : 400,
              cursor: "pointer", textDecoration: "none", display: "block"
            }}
          >
            {item.label}
          </a>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Wydarzenia</h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "4px 0 0" }}>Zarządzaj wszystkimi wydarzeniami</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm) }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1rem", cursor: "pointer", fontWeight: 600 }}
          >
            <Plus size={16} /> Dodaj wydarzenie
          </button>
        </div>

        {/* Filtry statusów */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem" }}>
          {[["all","Wszystkie"], ["published","Opublikowane"], ["draft","Szkice"], ["archived","Archiwum"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem",
                fontWeight: filterStatus === val ? 600 : 400,
                color: filterStatus === val ? "#16a34a" : "#6b7280",
                borderBottom: filterStatus === val ? "2px solid #16a34a" : "2px solid transparent",
                paddingBottom: "0.5rem",
              }}
            >
              {label} <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{counts[val as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {/* Lista wydarzeń */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th}>Wydarzenie</th>
                <th style={th}>Data</th>
                <th style={th}>Status</th>
                <th style={th}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img
                        src={event.cover_image_url || "/images/event-concert.jpg"}
                        alt={event.title}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                      <div>
                        <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>{event.title}</p>
                        <p style={{ color: "#6b7280", margin: 0, fontSize: "0.8rem" }}>
                          {event.address || event.city}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      {event.start_date ? new Date(event.start_date).toLocaleDateString("pl-PL") : "-"}
                    </p>
                    <p style={{ color: "#6b7280", margin: 0, fontSize: "0.8rem" }}>
                      {event.start_date ? new Date(event.start_date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : ""}
                      {event.end_date ? ` – ${new Date(event.end_date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
                      background: event.status === "published" ? "#f0fdf4" : "#f3f4f6",
                      color: STATUS_LABELS[event.status]?.color || "#6b7280"
                    }}>
                      {STATUS_LABELS[event.status]?.label || event.status}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={`/events/${event.slug}`} target="_blank" style={{ color: "#6b7280", cursor: "pointer" }}>
                        <Edit size={16} />
                      </a>
                      <button onClick={() => handleDelete(event.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>Brak wydarzeń</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel formularza */}
      {showForm && (
        <aside style={{ width: "400px", background: "white", borderLeft: "1px solid #e5e7eb", padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Dodaj wydarzenie</h2>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#6b7280" }}>×</button>
          </div>

          {/* Zakładki */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            {[["basic","Podstawowe"], ["location","Lokalizacja"], ["media","Zdjęcia"]].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem",
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "#16a34a" : "#6b7280",
                  borderBottom: activeTab === tab ? "2px solid #16a34a" : "2px solid transparent",
                  paddingBottom: "0.5rem",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {activeTab === "basic" && <>
              <input name="title" placeholder="Nazwa wydarzenia *" value={form.title} onChange={handleChange} required style={inp} />
              <input name="slug" placeholder="Slug (auto)" value={form.slug} onChange={handleChange} style={inp} />
              <input name="short_description" placeholder="Krótki opis" value={form.short_description} onChange={handleChange} style={inp} />
              <textarea name="description" placeholder="Pełny opis" value={form.description} onChange={handleChange} style={{ ...inp, height: "80px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} required style={inp} />
                <input name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} style={inp} />
              </div>
              <select name="category" value={form.category} onChange={handleChange} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <select name="status" value={form.status} onChange={handleChange} style={inp}>
                <option value="published">Opublikowane</option>
                <option value="draft">Szkic</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                <input name="is_free" type="checkbox" checked={form.is_free} onChange={handleChange} />
                Wstęp wolny
              </label>
              {!form.is_free && <input name="price_from" type="number" min="0" step="0.01" placeholder="Cena od (PLN)" value={form.price_from} onChange={handleChange} style={inp} />}
              <input name="organizer_name" placeholder="Organizator" value={form.organizer_name} onChange={handleChange} style={inp} />
            </>}

            {activeTab === "location" && <>
              <input name="city" placeholder="Miasto *" value={form.city} onChange={handleChange} style={inp} />
              <input name="venue_name" placeholder="Nazwa miejsca" value={form.venue_name} onChange={handleChange} style={inp} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input name="address" placeholder="Adres" value={form.address} onChange={handleChange} style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={handleGeocode} disabled={geocoding} style={geoBtn}>
                  {geocoding ? "..." : "Geocode"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} style={{ ...inp, background: "#f9f9f9" }} />
                <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} style={{ ...inp, background: "#f9f9f9" }} />
              </div>
            </>}

            {activeTab === "media" && <>
              <input name="cover_image_url" placeholder="URL zdjęcia okładki" value={form.cover_image_url} onChange={handleChange} style={inp} />
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }} />
              )}
              <input name="ticket_url" placeholder="Link do biletów" value={form.ticket_url} onChange={handleChange} style={inp} />
              <input name="website_url" placeholder="Strona www" value={form.website_url} onChange={handleChange} style={inp} />
            </>}

            {statusMsg && <p style={{ color: statusMsg.includes("Błąd") ? "#ef4444" : "#16a34a", fontSize: "0.875rem" }}>{statusMsg}</p>}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "0.6rem", border: "1px solid #e5e7eb", borderRadius: 8, background: "white", cursor: "pointer" }}>
                Anuluj
              </button>
              <button type="submit" style={{ flex: 1, padding: "0.6rem", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Zapisz
              </button>
            </div>
          </form>
        </aside>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "#6b7280" }
const td: React.CSSProperties = { padding: "0.75rem 1rem", verticalAlign: "middle" }
const inp: React.CSSProperties = { padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }
const geoBtn: React.CSSProperties = { padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }
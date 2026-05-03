"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

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

export default function AdminPage() {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState("")
  const [geocoding, setGeocoding] = useState(false)

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
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      )
      const data = await res.json()
      if (data[0]) {
        setForm((prev) => ({
          ...prev,
          latitude: parseFloat(data[0].lat).toFixed(6),
          longitude: parseFloat(data[0].lon).toFixed(6),
        }))
      } else {
        setStatus("⚠️ Nie znaleziono adresu")
      }
    } catch {
      setStatus("⚠️ Błąd geocodingu")
    }
    setGeocoding(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Zapisywanie...")

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      short_description: form.short_description || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      city: form.city,
      address: form.address || null,
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
      setStatus("❌ Błąd: " + error.message)
    } else {
      setStatus("✅ Wydarzenie dodane!")
      setForm(emptyForm)
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "620px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>➕ Dodaj wydarzenie</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        <input name="title" placeholder="Nazwa wydarzenia *" value={form.title} onChange={handleChange} required style={inputStyle} />
        <input name="slug" placeholder="Slug (auto)" value={form.slug} onChange={handleChange} required style={inputStyle} />
        <input name="short_description" placeholder="Krótki opis (karta)" value={form.short_description} onChange={handleChange} style={inputStyle} />
        <textarea name="description" placeholder="Pełny opis" value={form.description} onChange={handleChange} style={{ ...inputStyle, height: "100px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <input name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} required style={inputStyle} />
          <input name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} style={inputStyle} />
        </div>

        <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        <input name="city" placeholder="Miasto *" value={form.city} onChange={handleChange} required style={inputStyle} />
        <input name="venue_name" placeholder="Nazwa miejsca (np. Dom Kultury)" value={form.venue_name} onChange={handleChange} style={inputStyle} />

        <div style={{ display: "flex", gap: "8px" }}>
          <input name="address" placeholder="Adres (ul. Kościuszki 1)" value={form.address} onChange={handleChange} style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={handleGeocode} disabled={geocoding} style={geoBtnStyle}>
            {geocoding ? "..." : "📍 Geocode"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} style={{ ...inputStyle, background: "#f9f9f9" }} />
          <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} style={{ ...inputStyle, background: "#f9f9f9" }} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem" }}>
          <input name="is_free" type="checkbox" checked={form.is_free} onChange={handleChange} />
          Wstęp wolny
        </label>
        {!form.is_free && (
          <input name="price_from" type="number" min="0" step="0.01" placeholder="Cena od (PLN)" value={form.price_from} onChange={handleChange} style={inputStyle} />
        )}

        <input name="organizer_name" placeholder="Organizator" value={form.organizer_name} onChange={handleChange} style={inputStyle} />
        <input name="cover_image_url" placeholder="URL zdjęcia okładki" value={form.cover_image_url} onChange={handleChange} style={inputStyle} />
        <input name="ticket_url" placeholder="Link do biletów" value={form.ticket_url} onChange={handleChange} style={inputStyle} />
        <input name="website_url" placeholder="Strona www wydarzenie" value={form.website_url} onChange={handleChange} style={inputStyle} />

        <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
          <option value="published">Opublikowane</option>
          <option value="draft">Szkic</option>
        </select>

        <button type="submit" style={submitBtnStyle}>Dodaj wydarzenie</button>
        {status && <p>{status}</p>}
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem", borderRadius: "8px", border: "1px solid #ddd",
  fontSize: "1rem", width: "100%",
}
const geoBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #ddd",
  background: "#f3f4f6", cursor: "pointer", fontSize: "0.9rem", whiteSpace: "nowrap",
}
const submitBtnStyle: React.CSSProperties = {
  padding: "0.75rem", background: "#16a34a", color: "white",
  border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem",
}
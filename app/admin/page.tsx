"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminPage() {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    short_description: "",
    start_date: "",
    end_date: "",
    city: "",
    category: "technology",
  })
  const [status, setStatus] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Zapisywanie...")

    const { error } = await supabase.from("events").insert([form])

    if (error) {
      setStatus("Błąd: " + error.message)
    } else {
      setStatus("✅ Wydarzenie dodane!")
      setForm({
        title: "",
        slug: "",
        description: "",
        short_description: "",
        start_date: "",
        end_date: "",
        city: "",
        category: "technology",
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "title" ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
    }))
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>➕ Dodaj wydarzenie</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input name="title" placeholder="Nazwa wydarzenia" value={form.title} onChange={handleChange} required style={inputStyle} />
        <input name="slug" placeholder="Slug (auto)" value={form.slug} onChange={handleChange} required style={inputStyle} />
        <textarea name="description" placeholder="Opis" value={form.description} onChange={handleChange} style={{ ...inputStyle, height: "100px" }} />
        <input name="short_description" placeholder="Krótki opis" value={form.short_description} onChange={handleChange} style={inputStyle} />
        <input name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} required style={inputStyle} />
        <input name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} style={inputStyle} />
        <input name="city" placeholder="Miasto" value={form.city} onChange={handleChange} required style={inputStyle} />
        <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
          <option value="technology">Technology</option>
          <option value="music">Muzyka</option>
          <option value="food">Jedzenie</option>
          <option value="sport">Sport</option>
          <option value="culture">Kultura</option>
          <option value="family">Rodzinne</option>
        </select>
        <button type="submit" style={{ padding: "0.75rem", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }}>
          Dodaj wydarzenie
        </button>
        {status && <p>{status}</p>}
      </form>
    </main>
  )
}

const inputStyle = {
  padding: "0.75rem",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "1rem",
  width: "100%",
}
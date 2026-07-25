"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), { ssr: false })
import ImageUpload from "@/components/admin/ImageUpload"
import ScheduleEditor from "@/components/admin/ScheduleEditor"

const CATEGORIES = ["festyny","kultura","muzyka","sport"]
const CATEGORY_LABELS: Record<string,string> = {
  festyny:"Festyny", kultura:"Kultura", muzyka:"Muzyka", sport:"Sport"
}
const CATEGORY_COLORS: Record<string,string> = {
  festyny:"#f59e0b", kultura:"#7c3aed", muzyka:"#16a34a", sport:"#2563eb"
}

// Mapuje stare/legacy wartości kategorii z bazy na 4 docelowe kategorie
function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw ?? "").toLowerCase().trim()
  if (c === "kultura" || c === "culture") return "kultura"
  if (c === "muzyka" || c === "music") return "muzyka"
  if (c === "sport") return "sport"
  if (c === "festyny" || c === "festiwal") return "festyny"
  if (!c) return ""
  // food, family, technology, inne → festyny (rdzeń kategorii Evently)
  return "festyny"
}

// Zwraca dzisiejszą datę jako YYYY-MM-DD (do atrybutu min i porównań)
function todayStr(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

const emptyForm = {
  title:"", slug:"", description:"", short_description:"",
  start_date:"", start_time:"", end_date:"", end_time:"",
  city:"Suwałki", address:"", venue_name:"",
  category:"", cover_image_url:"", ticket_url:"", website_url:"",
  image_url:"",
  organizer_name:"", price_from:"0", is_free:true,
  latitude:"", longitude:"", status:"published",
  schedule:[] as {day:number;label:string;items:{time:string;title:string;description?:string}[]}[],
}

const SECTIONS = [
  { id:"basic", label:"Podstawowe", icon:"📋" },
  { id:"media", label:"Zdjęcia i plakat", icon:"🖼️" },
  { id:"location", label:"Lokalizacja", icon:"📍" },
  { id:"schedule", label:"Program", icon:"📅" },
  { id:"summary", label:"Podsumowanie", icon:"✅" },
]

export default function AdminWydarzenie({ eventId }: { eventId?: string }) {
    const [posterPreviewUrl, setPosterPreviewUrl] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [section, setSection] = useState("basic")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (eventId) loadEvent(eventId)
  }, [eventId])

  async function loadEvent(id: string) {
    const { data } = await supabase.from("events").select("*").eq("id", id).single()
    if (!data) return
    const startDate = data.start_date ? new Date(data.start_date) : null
    const endDate = data.end_date ? new Date(data.end_date) : null
    setForm({
      title: data.title || "",
      slug: data.slug || "",
      description: data.description || "",
      short_description: data.short_description || "",
      start_date: startDate ? startDate.toISOString().split("T")[0] : "",
      start_time: startDate ? startDate.toTimeString().slice(0,5) : "",
      end_date: endDate ? endDate.toISOString().split("T")[0] : "",
      end_time: endDate ? endDate.toTimeString().slice(0,5) : "",
      city: data.city || "",
      address: data.address || "",
      venue_name: data.venue_name || "",
      category: normalizeCategory(data.category),
      cover_image_url: data.cover_image_url || "",
      ticket_url: data.ticket_url || "",
      website_url: data.website_url || "",
      image_url: data.image_url || "",
      organizer_name: data.organizer_name || "",
      price_from: data.price_from?.toString() || "0",
      is_free: data.is_free ?? true,
      latitude: data.latitude?.toString() || "",
      longitude: data.longitude?.toString() || "",
      status: data.status || "published",
      schedule: data.schedule || [],
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "title" ? {
        slug: value.toLowerCase()
          .replace(/ą/g,"a").replace(/ę/g,"e").replace(/ó/g,"o")
          .replace(/ś/g,"s").replace(/ł/g,"l").replace(/ż/g,"z")
          .replace(/ź/g,"z").replace(/ć/g,"c").replace(/ń/g,"n")
          .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")
      } : {}),
    }))
  }

  const handleGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(", ")
    if (!query) return
    setGeocoding(true)
    try {
      const res = await fetch("/api/geocode?q=" + encodeURIComponent(query))
      const data = await res.json()
      if (data[0]) setForm(prev => ({
        ...prev,
        latitude: parseFloat(data[0].lat).toFixed(6),
        longitude: parseFloat(data[0].lon).toFixed(6)
      }))
    } catch {}
    setGeocoding(false)
  }

  const compressImage = (file: File): Promise<{base64:string;mediaType:string}> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 1200
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement("canvas")
          canvas.width = width; canvas.height = height
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL("image/jpeg", 0.8)
          resolve({ base64: compressed.split(",")[1], mediaType: "image/jpeg" })
        }
        img.src = e.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localPreview = URL.createObjectURL(file)
    setPosterPreviewUrl(localPreview)
    setScanning(true)
    setScanStatus("Analizuję plakat...")

    // Wgraj oryginalny plik do Supabase Storage równolegle ze skanowaniem AI —
    // żeby zeskanowany plakat automatycznie stał się plakatem/zdjęciem eventu
    const uploadPromise = (async () => {
      try {
        const ext = file.name.split(".").pop() || "jpg"
        const fileName = `event_${Date.now()}.${ext}`
        const { data, error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, file, { upsert: true })
        if (uploadError || !data) return null
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(data.path)
        return urlData.publicUrl
      } catch {
        return null
      }
    })()

    try {
      const { base64, mediaType } = await compressImage(file)
      const res = await fetch("/api/scan-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      })
      const data = await res.json()
      if (data.error) { setScanStatus("Błąd: " + data.error) }
      else {
        const uploadedUrl = await uploadPromise
        setForm(prev => ({
          ...prev,
          title: data.title || prev.title,
          slug: (data.title || "").toLowerCase()
            .replace(/ą/g,"a").replace(/ę/g,"e").replace(/ó/g,"o")
            .replace(/ś/g,"s").replace(/ł/g,"l").replace(/ż/g,"z")
            .replace(/ź/g,"z").replace(/ć/g,"c").replace(/ń/g,"n")
            .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""),
          city: data.city || prev.city,
          address: data.address || prev.address,
          venue_name: data.venue_name || prev.venue_name,
          start_date: data.start_date || prev.start_date,
          start_time: data.start_time || prev.start_time,
          end_date: data.end_date || prev.end_date,
          end_time: data.end_time || prev.end_time,
          description: data.description || prev.description,
          short_description: data.short_description || prev.short_description,
          organizer_name: data.organizer_name || prev.organizer_name,
          category: data.category ? normalizeCategory(data.category) : prev.category,
          is_free: data.is_free ?? prev.is_free,
          price_from: data.price_from?.toString() || prev.price_from,
          image_url: uploadedUrl || prev.image_url,
          cover_image_url: prev.cover_image_url || uploadedUrl || prev.cover_image_url,
          schedule: data.schedule?.length
            ? (() => {
                const days: Record<number,any[]> = {}
                data.schedule.forEach((item: any) => {
                  const d = item.day || 1
                  if (!days[d]) days[d] = []
                  days[d].push({ time: item.time, title: item.title, description: item.description })
                })
                return Object.entries(days).map(([d, items]) => ({
                  day: Number(d), label: `Dzień ${d}`, items
                }))
              })()
            : prev.schedule,
        }))
        setScanStatus(uploadedUrl
          ? "✅ Formularz wypełniony automatycznie, plakat zapisany"
          : "✅ Formularz wypełniony (plakat nie zapisał się — wgraj go ręcznie w zakładce Zdjęcia)")
        const cleanAddress = (data.address || "").replace(/ul\.\s*/gi,"").trim()
        if (cleanAddress || data.city) {
          await fetch("/api/geocode?q=" + encodeURIComponent([cleanAddress, data.city].filter(Boolean).join(", ")))
            .then(r => r.json())
            .then(d => { if (d[0]) setForm(prev => ({ ...prev, latitude: parseFloat(d[0].lat).toFixed(6), longitude: parseFloat(d[0].lon).toFixed(6) })) })
            .catch(() => {})
        }
      }
    } catch { setScanStatus("Błąd połączenia z AI") }
    setScanning(false)
    if (e.target) e.target.value = ""
  }

  const handleSave = async (statusOverride?: string) => {
    // Walidacja: data startu nie może być z przeszłości (poza szkicem)
    if (statusOverride !== "draft" && form.start_date && form.start_date < todayStr()) {
      setMsg("Błąd: Data rozpoczęcia nie może być z przeszłości")
      setSection("basic")
      return
    }
    if (statusOverride !== "draft" && form.end_date && form.start_date && form.end_date < form.start_date) {
      setMsg("Błąd: Data zakończenia nie może być wcześniejsza niż rozpoczęcia")
      setSection("basic")
      return
    }
    setSaving(true)
    setMsg("Zapisywanie...")
    const start = form.start_date && form.start_time ? form.start_date + "T" + form.start_time : form.start_date
    const end = form.end_date && form.end_time ? form.end_date + "T" + form.end_time : (form.end_date || null)
    const payload = {
      title: form.title, slug: form.slug,
      description: form.description || null,
      short_description: form.short_description || null,
      start_date: start, end_date: end,
      city: form.city, address: form.address || null,
      venue_name: form.venue_name || null,
      category: form.category,
      cover_image_url: form.cover_image_url || null,
      image_url: form.image_url || null,
      ticket_url: form.ticket_url || null,
      website_url: form.website_url || null,
      organizer_name: form.organizer_name || null,
      is_free: form.is_free,
      price_from: form.is_free ? null : (parseFloat(form.price_from) || null),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      status: statusOverride || form.status,
      schedule: form.schedule,
    }
    const { error } = eventId
      ? await supabase.from("events").update(payload).eq("id", eventId)
      : await supabase.from("events").insert([payload])
    if (error) { setMsg("Błąd: " + error.message) }
    else {
      setMsg(statusOverride === "published" ? "✅ Opublikowano!" : "✅ Zapisano szkic!")
      setTimeout(() => { window.location.href = "/admin" }, 1500)
    }
    setSaving(false)
  }

  const formatDate = (date: string, time: string) => {
    if (!date) return null
    try {
      const d = new Date(date + (time ? "T" + time : ""))
      return d.toLocaleDateString("pl-PL", { day:"numeric", month:"long", year:"numeric" }) + (time ? `, ${time}` : "")
    } catch { return date }
  }

  const sidebarW = 200
  const previewW = 320
  // Na wąskim ekranie chowamy panele boczne i rozciągamy formularz na całość.

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8fafc", fontFamily:"system-ui, sans-serif" }}>
<style>{`
  @media (max-width: 1100px) {
    .admin-sidebar, .admin-preview { display: none !important; }
    .admin-main { margin-left: 0 !important; margin-right: 0 !important; }
        .admin-pills { display: flex !important; }
        .admin-main [style*="grid"] { grid-template-columns: 1fr !important; }
  }
`}</style>

      {/* LEWE MENU */}
      <aside className="admin-sidebar" style={{ width:sidebarW, background:"white", borderRight:"1px solid #e5e7eb", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:10 }}>
        
        {/* Logo */}
        <div style={{ padding:"20px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"#16a34a", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📍</div>
          <span style={{ fontWeight:700, fontSize:16, color:"#16a34a" }}>evently</span>
        </div>

        {/* Powrót */}
        <a href="/admin" style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid #f3f4f6", color:"#6b7280", fontSize:13, textDecoration:"none" }}>
          ← Lista wydarzeń
        </a>

        {/* Sekcje */}
        <nav style={{ padding:"12px 8px", flex:1 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px",
              borderRadius:8, border:"none", cursor:"pointer", fontSize:13, textAlign:"left", marginBottom:2,
              background: section === s.id ? "#f0fdf4" : "transparent",
              color: section === s.id ? "#16a34a" : "#374151",
              fontWeight: section === s.id ? 600 : 400,
              borderLeft: section === s.id ? "3px solid #16a34a" : "3px solid transparent",
            }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Status info */}
        <div style={{ padding:"12px 16px", borderTop:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:11, color:"#9ca3af", marginBottom:4 }}>Status</div>
          <select name="status" value={form.status} onChange={handleChange} style={{ width:"100%", padding:"6px 8px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, color:"#374151" }}>
            <option value="published">Opublikowane</option>
            <option value="draft">Szkic</option>
          </select>
        </div>
      </aside>

      {/* ŚRODEK: FORMULARZ */}
      <main className="admin-main" style={{ marginLeft:sidebarW, marginRight:previewW, flex:1, minHeight:"100vh" }}>
        {/* PIGUŁKI SEKCJI — tylko mobile */}
        <div className="admin-pills" style={{ display:"none", gap:8, overflowX:"auto", padding:"12px 16px", borderBottom:"1px solid #e5e7eb", background:"white", position:"sticky", top:0, zIndex:6, WebkitOverflowScrolling:"touch" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:999,
              border:"1px solid", whiteSpace:"nowrap", fontSize:13, cursor:"pointer", flexShrink:0,
              background: section === s.id ? "#16a34a" : "white",
              color: section === s.id ? "white" : "#374151",
              borderColor: section === s.id ? "#16a34a" : "#e5e7eb",
              fontWeight: section === s.id ? 600 : 400,
            }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        
        {/* Header */}
        <div style={{ padding:"20px 32px 16px", borderBottom:"1px solid #e5e7eb", background:"white", position:"sticky", top:0, zIndex:5, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111827" }}>
              {eventId ? "Edytuj wydarzenie" : "Dodaj wydarzenie"}
            </h1>
            {msg && <p style={{ margin:"4px 0 0", fontSize:13, color: msg.includes("Błąd") ? "#ef4444" : "#16a34a" }}>{msg}</p>}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => handleSave("draft")} disabled={saving} style={{ padding:"9px 18px", border:"1px solid #e5e7eb", borderRadius:8, background:"white", fontSize:13, color:"#374151", cursor:"pointer", fontWeight:500 }}>
              💾 Zapisz szkic
            </button>
            <button onClick={() => handleSave("published")} disabled={saving || !form.title || !form.start_date} style={{
              padding:"9px 18px", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
              background: (!form.title || !form.start_date) ? "#d1fae5" : "#16a34a",
              color: (!form.title || !form.start_date) ? "#6b7280" : "white",
            }}>
              🚀 Opublikuj wydarzenie
            </button>
          </div>
        </div>

        {/* Skaner AI */}
        <div style={{ margin:"20px 32px", background:"#f0fdf4", border:"1.5px dashed #16a34a", borderRadius:12, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:"#16a34a", marginBottom:2 }}>🤖 Skanuj plakat AI</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Prześlij plakat, a AI automatycznie wypełni pola</div>
            {scanStatus && <div style={{ fontSize:12, color: scanStatus.startsWith("✅") ? "#16a34a" : "#ef4444", marginTop:4 }}>{scanStatus}</div>}
            {scanStatus?.startsWith("✅") && posterPreviewUrl && (
  <div style={{marginTop:8, position:"relative", display:"inline-block"}}>
    <img 
      src={posterPreviewUrl} 
      alt="Plakat"
      style={{height:80, borderRadius:8, cursor:"pointer", border:"2px solid #16a34a"}}
      onClick={() => window.open(posterPreviewUrl, "_blank")}
    />
    <div style={{fontSize:11, color:"#16a34a", marginTop:4, textAlign:"center"}}>
      👆 Kliknij aby zobaczyć pełny plakat
    </div>
  </div>
)}
          </div>
          <button onClick={() => inputRef.current?.click()} disabled={scanning} style={{ padding:"9px 20px", background:"#16a34a", border:"none", borderRadius:8, fontSize:13, color:"white", cursor:"pointer", fontWeight:600 }}>
            {scanning ? "Analizuje..." : "Skanuj plakat AI"}
          </button>
        </div>
        <input ref={inputRef} type="file" onChange={handleScan} style={{ display:"none" }} />
        <input ref={cameraRef} type="file" capture="environment" onChange={handleScan} style={{ display:"none" }} />

        {/* Zawartość sekcji */}
        <div style={{ padding:"0 32px 40px" }}>

          {/* PODSTAWOWE */}
          {section === "basic" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <SectionTitle>Podstawowe informacje</SectionTitle>

              <Field label="Nazwa wydarzenia *">
                <input name="title" value={form.title} onChange={handleChange} placeholder="np. Dni Suwałk 2026" required style={inp} maxLength={100} />
                <Counter cur={form.title.length} max={100} />
              </Field>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Kategoria *">
                  <select name="category" value={form.category} onChange={handleChange} required style={inp}>
                    <option value="" disabled>Wybierz kategorię...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </Field>
                <Field label="Organizator">
                  <input name="organizer_name" value={form.organizer_name} onChange={handleChange} placeholder="np. Urząd Miasta Suwałki" style={inp} />
                </Field>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Field label="Data rozpoczęcia *">
                  <input name="start_date" type="date" min={todayStr()} value={form.start_date} onChange={handleChange} required style={inp} />
                </Field>
                <Field label="Godzina">
                  <input name="start_time" type="time" value={form.start_time} onChange={handleChange} style={inp} />
                </Field>
                <Field label="Data zakończenia">
                  <input name="end_date" type="date" value={form.end_date} onChange={handleChange} style={inp} />
                </Field>
                <Field label="Godzina">
                  <input name="end_time" type="time" value={form.end_time} onChange={handleChange} style={inp} />
                </Field>
              </div>

              <Field label="Krótki opis *">
                <textarea name="short_description" value={form.short_description} onChange={handleChange} placeholder="Napisz krótki opis wydarzenia (widoczny na liście)..." style={{ ...inp, height:80, resize:"vertical" }} maxLength={200} />
                <Counter cur={form.short_description.length} max={200} />
              </Field>

              <Field label="Pełny opis">
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Opisz szczegóły wydarzenia..." style={{ ...inp, height:140, resize:"vertical" }} maxLength={2000} />
                <Counter cur={form.description.length} max={2000} />
              </Field>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
                  <input name="is_free" type="checkbox" checked={form.is_free} onChange={handleChange} style={{ width:16, height:16 }} />
                  <span style={{ fontWeight:500 }}>Wstęp wolny</span>
                </label>
                {!form.is_free && (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, color:"#6b7280" }}>Cena od:</span>
                    <input name="price_from" type="number" min="0" step="0.01" value={form.price_from} onChange={handleChange} style={{ ...inp, width:100 }} />
                    <span style={{ fontSize:13, color:"#6b7280" }}>PLN</span>
                  </div>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Link do biletów">
                  <input name="ticket_url" value={form.ticket_url} onChange={handleChange} placeholder="https://..." style={inp} />
                </Field>
                <Field label="Strona www">
                  <input name="website_url" value={form.website_url} onChange={handleChange} placeholder="https://..." style={inp} />
                </Field>
              </div>
            </div>
          )}

          {/* ZDJĘCIA */}
          {section === "media" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <SectionTitle>Zdjęcia i plakat</SectionTitle>
              <Field label="Zdjęcie okładki">
                <ImageUpload currentUrl={form.cover_image_url} onUploadComplete={(url) => setForm(prev => ({ ...prev, cover_image_url: url }))} />
                <div style={{ display:"flex", alignItems:"center", gap:8, margin:"10px 0" }}>
                  <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
                  <span style={{ fontSize:12, color:"#9ca3af" }}>lub wklej URL</span>
                  <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
                </div>
                <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange} placeholder="https://..." style={inp} />
              </Field>
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="podgląd" style={{ width:"100%", height:220, objectFit:"cover", borderRadius:10 }} />
              )}
              <Field label="Plakat wydarzenia (pionowy)">
                <ImageUpload currentUrl={form.image_url||""} onUploadComplete={(url) => setForm(prev => ({ ...prev, image_url: url }))} />
                <div style={{ display:"flex", alignItems:"center", gap:8, margin:"10px 0" }}>
                  <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
                  <span style={{ fontSize:12, color:"#9ca3af" }}>lub wklej URL</span>
                  <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
                </div>
                <input name="image_url" value={form.image_url||""} onChange={handleChange} placeholder="https://... wklej URL plakatu" style={inp} />
                {form.image_url && (
                  <img src={form.image_url} alt="podgląd plakatu" style={{ width:"100%", maxHeight:280, objectFit:"contain", borderRadius:10, marginTop:10, background:"#f3f4f6" }} />
                )}
              </Field>
            </div>
          )}

          {/* LOKALIZACJA */}
          {section === "location" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <SectionTitle>Lokalizacja</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Miasto *">
                  <input name="city" value={form.city} onChange={handleChange} placeholder="np. Suwałki" style={inp} />
                </Field>
                <Field label="Nazwa miejsca">
                  <input name="venue_name" value={form.venue_name} onChange={handleChange} placeholder="np. Dom Kultury" style={inp} />
                </Field>
              </div>
              <Field label="Adres">
                <div style={{ display:"flex", gap:8 }}>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="ul. Kościuszki 1" style={{ ...inp, flex:1 }} />
                  <button type="button" onClick={handleGeocode} disabled={geocoding} style={{ padding:"0 16px", border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>
                    {geocoding ? "..." : "📍 Geocode"}
                  </button>
                </div>
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Szerokość geograficzna">
                  <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="54.1116" style={{ ...inp, background:"#f9fafb" }} />
                </Field>
                <Field label="Długość geograficzna">
                  <input name="longitude" value={form.longitude} onChange={handleChange} placeholder="22.9302" style={{ ...inp, background:"#f9fafb" }} />
                </Field>
              </div>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            </div>
          )}

          {/* PROGRAM */}
          {section === "schedule" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <SectionTitle>Program imprezy</SectionTitle>
              <ScheduleEditor
                value={form.schedule}
                onChange={(items) => setForm(prev => ({ ...prev, schedule: items }))}
              />
            </div>
          )}

          {/* PODSUMOWANIE */}
          {section === "summary" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <SectionTitle>Podsumowanie</SectionTitle>
              <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:"20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { label:"Nazwa", value: form.title, ok: !!form.title },
                  { label:"Data", value: formatDate(form.start_date, form.start_time), ok: !!form.start_date },
                  { label:"Miasto", value: form.city, ok: !!form.city },
                  { label:"Opis", value: form.short_description ? "✓ Wypełniony" : null, ok: !!form.short_description },
                  { label:"Zdjęcie", value: form.cover_image_url ? "✓ Dodane" : null, ok: !!form.cover_image_url },
                  { label:"Lokalizacja GPS", value: form.latitude ? `${form.latitude}, ${form.longitude}` : null, ok: !!form.latitude },
                ].map(({ label, value, ok }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:18 }}>{ok ? "✅" : "⚠️"}</span>
                    <span style={{ width:120, fontSize:13, color:"#6b7280", flexShrink:0 }}>{label}</span>
                    <span style={{ fontSize:13, color: ok ? "#111827" : "#9ca3af" }}>{value || "Brak"}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:12, marginTop:8 }}>
                <button onClick={() => handleSave("draft")} style={{ flex:1, padding:"12px", border:"1px solid #e5e7eb", borderRadius:8, background:"white", fontSize:14, cursor:"pointer" }}>Zapisz szkic</button>
                <button onClick={() => handleSave("published")} disabled={!form.title || !form.start_date} style={{ flex:2, padding:"12px", border:"none", borderRadius:8, background:"#16a34a", color:"white", fontSize:14, fontWeight:600, cursor:"pointer" }}>🚀 Opublikuj wydarzenie</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* PRAWA: PODGLĄD NA ŻYWO */}
      <aside className="admin-preview" style={{ width:previewW, position:"fixed", top:0, right:0, bottom:0, background:"#f1f5f9", borderLeft:"1px solid #e5e7eb", overflow:"auto" }}>
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid #e5e7eb", background:"white", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Podgląd na żywo</span>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#16a34a", display:"inline-block" }} />
        </div>

        <div style={{ padding:16 }}>
          {/* Karta eventu */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            
            {/* Zdjęcie */}
            <div style={{ height:160, background: form.cover_image_url ? undefined : "#1e293b", position:"relative", overflow:"hidden" }}>
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"rgba(255,255,255,0.2)", fontSize:32 }}>🖼️</div>
              )}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
              {form.is_free && (
                <div style={{ position:"absolute", top:10, left:10, background:"#16a34a", color:"white", fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20 }}>Bezpłatne</div>
              )}
              {form.category && (
                <div style={{ position:"absolute", top:10, right:10, background:CATEGORY_COLORS[form.category] || "#6b7280", color:"white", fontSize:11, padding:"3px 10px", borderRadius:20 }}>
                  {CATEGORY_LABELS[form.category]}
                </div>
              )}
            </div>

            {/* Treść */}
            <div style={{ padding:"14px 16px" }}>
              <h2 style={{ margin:"0 0 10px", fontSize:16, fontWeight:700, color:"#111827", lineHeight:1.3 }}>
                {form.title || <span style={{ color:"#d1d5db" }}>Nazwa wydarzenia</span>}
              </h2>

              {form.start_date && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:14 }}>📅</span>
                  <span style={{ fontSize:12, color:"#374151" }}>
                    {formatDate(form.start_date, form.start_time)}
                    {form.end_date && form.end_date !== form.start_date && ` – ${formatDate(form.end_date, form.end_time)}`}
                  </span>
                </div>
              )}

              {(form.city || form.address) && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                  <span style={{ fontSize:14 }}>📍</span>
                  <span style={{ fontSize:12, color:"#374151" }}>
                    {[form.venue_name, form.address, form.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {form.short_description && (
                <p style={{ fontSize:12, color:"#6b7280", margin:"0 0 14px", lineHeight:1.6 }}>
                  {form.short_description}
                </p>
              )}

              <button style={{ width:"100%", padding:"10px", background:"#16a34a", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Weź udział →
              </button>
            </div>
          </div>

          {/* Co dalej */}
          <div style={{ marginTop:16, background:"white", borderRadius:10, border:"1px solid #e5e7eb", padding:"14px 16px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>Co dalej?</div>
            {[
              { label:"Dodaj zdjęcia", done: !!form.cover_image_url, section:"media" },
              { label:"Uzupełnij lokalizację", done: !!form.city && !!form.latitude, section:"location" },
              { label:"Dodaj program", done: form.schedule.length > 0, section:"schedule" },
              { label:"Sprawdź podsumowanie", done: false, section:"summary" },
            ].map(item => (
              <button key={item.label} onClick={() => setSection(item.section)} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%", padding:"7px 0",
                background:"none", border:"none", cursor:"pointer", textAlign:"left",
                borderBottom:"1px solid #f3f4f6",
              }}>
                <span style={{ fontSize:14 }}>{item.done ? "✅" : "⭕"}</span>
                <span style={{ fontSize:12, color: item.done ? "#6b7280" : "#111827", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
              </button>
            ))}
          </div>

          <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", marginTop:12 }}>Podgląd aktualizuje się na żywo</p>
        </div>
      </aside>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize:16, fontWeight:700, color:"#111827", margin:"20px 0 4px", paddingBottom:10, borderBottom:"1px solid #f3f4f6" }}>{children}</h2>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}

function Counter({ cur, max }: { cur: number; max: number }) {
  return <div style={{ fontSize:11, color:"#9ca3af", textAlign:"right", marginTop:3 }}>{cur}/{max}</div>
}

const inp: React.CSSProperties = {
  padding:"9px 12px", borderRadius:8, border:"1px solid #e5e7eb",
  fontSize:14, width:"100%", boxSizing:"border-box", outline:"none",
  background:"white", color:"#111827",
}
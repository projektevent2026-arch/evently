"use client"

import PosterScanner from "@/components/admin/PosterScanner"
import ImageUpload from "@/components/admin/ImageUpload"
import ScheduleEditor from "@/components/admin/ScheduleEditor"
import dynamic from "next/dynamic"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { MapPin, ChevronRight, CheckCircle } from "lucide-react"
import Link from "next/link"

const LocationPicker = dynamic(
  () => import("@/components/admin/LocationPicker"),
  { ssr: false }
)

const CATEGORIES = ["festyny","kultura","muzyka","sport"]
const CATEGORY_LABELS: Record<string,string> = {
  festyny:"Festyny 🎪", kultura:"Kultura", muzyka:"Muzyka", sport:"Sport"
}

// Zwraca dzisiejszą datę jako YYYY-MM-DD (do atrybutu min i porównań)
function todayStr(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

const emptyForm = {
  title: "", description: "",
  start_date: "", start_time: "", end_date: "", end_time: "",
  city: "", address: "", venue_name: "",
  category: "", cover_image_url: "", image_url: "",
  ticket_url: "", website_url: "",
  organizer_name: "", organizer_email: "",
  price_from: "0", is_free: true,
  latitude: "", longitude: "",
  schedule: [] as any[],
}

export default function DodajWydarzenie() {
  const [form, setForm] = useState(emptyForm)
  const [activeTab, setActiveTab] = useState("basic")
  const [geocoding, setGeocoding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [improvingDesc, setImprovingDesc] = useState(false)
  const [improveError, setImproveError] = useState("")
  const [originalDescription, setOriginalDescription] = useState<string | null>(null)
  const [conciseVariant, setConciseVariant] = useState<string | null>(null)
  const [richVariant, setRichVariant] = useState<string | null>(null)
  const [currentVariant, setCurrentVariant] = useState<"concise" | "rich" | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "is_free" && checked ? { price_from: "0" } : {}),
    }))
  }

  const handleGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(", ")
    if (!query) return
    setGeocoding(true)
    try {
      const res = await fetch("/api/geocode?q=" + encodeURIComponent(query))
      const data = await res.json()
      if (data[0]) {
        setForm(prev => ({
          ...prev,
          latitude: parseFloat(data[0].lat).toFixed(6),
          longitude: parseFloat(data[0].lon).toFixed(6),
        }))
      }
    } catch {}
    setGeocoding(false)
  }

  const handleImproveDescription = async () => {
    if (improvingDesc) return

    // Jeśli tekst w polu nie pasuje ani do oryginału, ani do żadnego z
    // wygenerowanych wariantów — user go ręcznie zmienił od ostatniego
    // kliknięcia. Zaczynamy od nowa, żeby nie poprawiać już poprawionego
    // tekstu (to gubiło fakty, jak przy godzinie w teście z koncertem).
    const manuallyEdited =
      originalDescription !== null &&
      form.description !== originalDescription &&
      form.description !== conciseVariant &&
      form.description !== richVariant

    const baseText = (originalDescription === null || manuallyEdited) ? form.description : originalDescription
    if (!baseText.trim()) return

    if (manuallyEdited) {
      setConciseVariant(null)
      setRichVariant(null)
      setCurrentVariant(null)
    }
    if (originalDescription === null || manuallyEdited) {
      setOriginalDescription(baseText)
    }

    // Która wersja jest następna w kolejce przełącznika (1 -> zwięzła, 2 -> bogata, 3 -> zwięzła, ...)
    const nextVariant: "concise" | "rich" =
      (currentVariant === null || currentVariant === "rich" || manuallyEdited) ? "concise" : "rich"

    // Jeśli ten wariant już mamy wygenerowany — pokaż go od razu, bez pytania AI ponownie.
    const cached = nextVariant === "concise" ? (manuallyEdited ? null : conciseVariant) : (manuallyEdited ? null : richVariant)
    if (cached) {
      setForm(prev => ({ ...prev, description: cached }))
      setCurrentVariant(nextVariant)
      return
    }

    setImprovingDesc(true)
    setImproveError("")
    try {
      const res = await fetch("/api/improve-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: baseText, style: nextVariant }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setImproveError(data.error || `Błąd serwera (${res.status})`)
      } else if (data.description) {
        setForm(prev => ({ ...prev, description: data.description }))
        setCurrentVariant(nextVariant)
        if (nextVariant === "concise") setConciseVariant(data.description)
        else setRichVariant(data.description)
      } else {
        setImproveError("Pusta odpowiedź od AI")
      }
    } catch (err) {
      setImproveError("Błąd połączenia z serwerem")
    }
    setImprovingDesc(false)
  }

  const improveButtonLabel = improvingDesc
    ? "Poprawiam..."
    : currentVariant === "concise"
    ? "✨ Spróbuj bogatszy styl"
    : currentVariant === "rich"
    ? "✨ Wersja zwięzła"
    : "✨ Ulepsz opis AI"

  const generateSlug = (title: string) =>
    title.toLowerCase()
      .replace(/ą/g,"a").replace(/ę/g,"e").replace(/ó/g,"o")
      .replace(/ś/g,"s").replace(/ł/g,"l").replace(/ż/g,"z")
      .replace(/ź/g,"z").replace(/ć/g,"c").replace(/ń/g,"n")
      .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")
      + "-" + Date.now().toString(36)

  // Generuje krótki opis z pełnego opisu przy zapisie — bez osobnego pola w formularzu
  const generateShortDescription = (text: string, maxLen = 160) => {
    const trimmed = (text || "").trim()
    if (!trimmed) return ""
    if (trimmed.length <= maxLen) return trimmed
    const cut = trimmed.slice(0, maxLen)
    const lastSpace = cut.lastIndexOf(" ")
    return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

// Walidacja: data startu nie może być z przeszłości
if (form.start_date && form.start_date < todayStr()) {
  setError("Data rozpoczęcia nie może być z przeszłości.")
  setActiveTab("basic")
  return
}

// Walidacja: godzina rozpoczęcia jest wymagana — sam atrybut required na polu
// type="time" nie zawsze blokuje wysyłkę na wszystkich przeglądarkach/telefonach,
// więc sprawdzamy to też jawnie w JS (ten sam bug, co naprawiony w panelu admina).
if (form.start_date && !form.start_time) {
  setError("Podaj godzinę rozpoczęcia.")
  setActiveTab("basic")
  return
}

// Walidacja: data końca nie może być wcześniejsza niż start
if (form.end_date && form.start_date && form.end_date < form.start_date) {
  setError("Data zakończenia nie może być wcześniejsza niż rozpoczęcia.")
  setActiveTab("basic")
  return
}

    setSubmitting(true)
    setError("")

    try {
      const start = form.start_date && form.start_time
        ? form.start_date + "T" + form.start_time
        : form.start_date
      const end = form.end_date && form.end_time
        ? form.end_date + "T" + form.end_time
        : (form.end_date || null)

      const { error: supabaseError } = await supabase.from("events").insert([{
        title: form.title,
        slug: generateSlug(form.title),
        description: form.description || null,
        short_description: generateShortDescription(form.description) || null,
        start_date: start,
        end_date: end,
        city: form.city,
        address: form.address || null,
        venue_name: form.venue_name || null,
        category: form.category,
        cover_image_url: form.cover_image_url || null,
        image_url: form.image_url || null,
        ticket_url: form.ticket_url || null,
        website_url: form.website_url || null,
        organizer_name: form.organizer_name || null,
        organizer_email: form.organizer_email || null,
        is_free: form.is_free,
        price_from: form.is_free ? null : (parseFloat(form.price_from) || null),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        schedule: form.schedule && form.schedule.length ? form.schedule : null,
        status: "pending",
      }])

      if (supabaseError) {
        setError("Błąd zapisu: " + supabaseError.message)
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      setError("Błąd sieci. Sprawdź połączenie i spróbuj ponownie.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:20}}>
        <div style={{background:"white",borderRadius:16,padding:"3rem 2.5rem",maxWidth:480,width:"100%",textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.5rem"}}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h1 style={{fontSize:"1.5rem",fontWeight:800,color:"#111827",marginBottom:12}}>Dziękujemy!</h1>
          <p style={{color:"#6b7280",lineHeight:1.6,marginBottom:24}}>
            Twoje wydarzenie zostało przesłane do weryfikacji. Nasz zespół sprawdzi je i opublikuje w ciągu 24 godzin.
          </p>
          <Link href="/" style={{display:"inline-block",background:"#16a34a",color:"white",padding:"0.75rem 2rem",borderRadius:10,fontWeight:700,textDecoration:"none",fontSize:"0.95rem"}}>
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",fontFamily:"sans-serif"}}>
      <style>{`
        input::placeholder, textarea::placeholder { color: #6b7280; }
        input, textarea, select { color: #111827; }
        /* Pola daty: 2 kolumny na telefonie, 4 na szerszym ekranie */
        .date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        @media (min-width: 640px) { .date-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
      `}</style>

      {/* Header */}
      <header style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"1rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <Link href="/" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{fontWeight:700,fontSize:"1.1rem",color:"#16a34a"}}>evently</span>
        </Link>
        <span style={{fontSize:"0.85rem",color:"#6b7280"}}>Formularz zgłoszenia wydarzenia</span>
      </header>

      <div style={{maxWidth:760,margin:"2rem auto",padding:"0 1rem",paddingBottom:"calc(6rem + env(safe-area-inset-bottom))"}}>

        <div style={{marginBottom:"1.5rem"}}>
          <h1 style={{fontSize:"1.75rem",fontWeight:800,color:"#111827",margin:"0 0 6px"}}>Dodaj wydarzenie</h1>
          <p style={{color:"#6b7280",margin:0}}>Wypełnij formularz — opublikujemy je bezpłatnie po weryfikacji.</p>
        </div>

        <div style={{background:"white",borderRadius:16,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",overflow:"hidden"}}>

          <div style={{display:"flex",borderBottom:"1px solid #e5e7eb",padding:"0 1.5rem",overflowX:"auto"}}>
            {[
              ["basic","📋 Podstawowe"],
              ["schedule","📅 Program"],
              ["location","📍 Lokalizacja"],
              ["media","🖼️ Zdjęcia i linki"],
            ].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background:"none",border:"none",cursor:"pointer",
                fontSize:"0.875rem",padding:"1rem 0",marginRight:"1.5rem",whiteSpace:"nowrap",
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "#16a34a" : "#6b7280",
                borderBottom: activeTab === tab ? "2px solid #16a34a" : "2px solid transparent",
              }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{padding:"1.75rem",display:"flex",flexDirection:"column",gap:"1.25rem"}}>

            {activeTab === "basic" && <>
              <div>
                <div style={{marginBottom:8}}>
                  <PosterScanner
                    onScanComplete={async (data) => {
                      setForm(prev => ({
                        ...prev,
                        title: data.title || prev.title,
                        city: data.city || prev.city,
                        address: data.address || prev.address,
                        venue_name: data.venue_name || prev.venue_name,
                        start_date: data.start_date || prev.start_date,
                        start_time: data.start_time || prev.start_time,
                        end_date: data.end_date || prev.end_date,
                        end_time: data.end_time || prev.end_time,
                        description: data.description || prev.description,
                        organizer_name: data.organizer_name || prev.organizer_name,
                        category: data.category || prev.category,
                        is_free: data.is_free ?? prev.is_free,
                        price_from: data.price_from?.toString() || prev.price_from,
                      }))
                      if (data.address || data.city) {
                        const query = [data.address, data.city].filter(Boolean).join(", ")
                        try {
                          const res = await fetch("/api/geocode?q=" + encodeURIComponent(query))
                          const geo = await res.json()
                          if (geo[0]) {
                            setForm(prev => ({
                              ...prev,
                              latitude: parseFloat(geo[0].lat).toFixed(6),
                              longitude: parseFloat(geo[0].lon).toFixed(6),
                            }))
                          }
                        } catch {}
                      }
                    }}
                  />
                  <p style={{fontSize:"0.75rem",color:"#9ca3af",margin:"4px 0 0"}}>
                    Wgraj zdjęcie plakatu — AI automatycznie wypełni formularz.
                  </p>
                </div>
                <label style={lbl}>Nazwa wydarzenia *</label>
                <input name="title" value={form.title} onChange={handleChange} required
                  placeholder="np. Dni Suwałk 2026" style={inp} maxLength={100} />
                <div style={counter}>{form.title.length}/100</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                <div>
                  <label style={lbl}>Kategoria *</label>
                  <select name="category" value={form.category} onChange={handleChange} required style={inp}>
                    <option value="" disabled>Wybierz kategorię...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Organizator</label>
                  <input name="organizer_name" value={form.organizer_name} onChange={handleChange}
                    placeholder="np. Urząd Miasta" style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Email kontaktowy</label>
                <input name="organizer_email" type="email" value={form.organizer_email} onChange={handleChange}
                  placeholder="kontakt@organizator.pl" style={inp} />
                <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:4}}>Nie będzie widoczny publicznie. Użyjemy go tylko w razie pytań.</div>
              </div>

              <div>
                <label style={lbl}>Data i godzina *</label>
                <div className="date-grid">
                  <div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Data od</div>
                    <input name="start_date" type="date" min={todayStr()} value={form.start_date} onChange={handleChange} required style={inp} />
                  </div>
                  <div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Godzina od</div>
                    <input name="start_time" type="time" value={form.start_time} onChange={handleChange} required style={inp} />
                  </div>
                  <div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Data do</div>
                    <input name="end_date" type="date" min={form.start_date || todayStr()} value={form.end_date} onChange={handleChange} style={inp} />
                  </div>
                  <div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Godzina do</div>
                    <input name="end_time" type="time" value={form.end_time} onChange={handleChange} style={inp} />
                  </div>
                </div>
              </div>

              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <label style={{...lbl,marginBottom:0}}>Pełny opis</label>
                  <button type="button" onClick={handleImproveDescription}
                    disabled={improvingDesc || !form.description.trim()}
                    style={{
                      display:"flex",alignItems:"center",gap:4,padding:"4px 10px",
                      border:"1px solid #bbf7d0",borderRadius:20,background:"#f0fdf4",
                      color:"#16a34a",fontSize:"0.75rem",fontWeight:600,fontFamily:"inherit",
                      cursor: improvingDesc || !form.description.trim() ? "default" : "pointer",
                      opacity: improvingDesc || !form.description.trim() ? 0.5 : 1,
                    }}>
                    {improveButtonLabel}
                  </button>
                </div>
                <textarea name="description" value={form.description} onChange={handleChange}
                  placeholder="Opisz szczegóły, atrakcje, program..." style={{...inp,height:140,resize:"vertical"}} maxLength={2000} />
                {improveError && (
                  <div style={{fontSize:"0.78rem",color:"#ef4444",marginTop:4}}>⚠️ {improveError}</div>
                )}
                <div style={counter}>{form.description.length}/2000</div>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:"1.5rem",flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.9rem",fontWeight:500}}>
                  <input name="is_free" type="checkbox" checked={form.is_free} onChange={handleChange} style={{width:16,height:16}} />
                  Wstęp wolny
                </label>
                {!form.is_free && (
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <label style={{...lbl,margin:0}}>Cena od (PLN)</label>
                    <input name="price_from" type="number" min="0" step="0.01"
                      value={form.price_from} onChange={handleChange} style={{...inp,width:100}} />
                  </div>
                )}
              </div>

              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button type="button" onClick={() => setActiveTab("schedule")} style={nextBtn}>
                  Dalej: Program <ChevronRight size={16} />
                </button>
              </div>
            </>}

            {activeTab === "schedule" && <>
              <div>
                <label style={lbl}>Program wydarzenia <span style={{fontWeight:400,color:"#9ca3af"}}>(opcjonalnie — godziny i punkty programu)</span></label>
                <ScheduleEditor
                  value={form.schedule}
                  onChange={(days) => setForm(prev => ({ ...prev, schedule: days }))}
                />
              </div>

              <div style={{display:"flex",justifyContent:"space-between"}}>
                <button type="button" onClick={() => setActiveTab("basic")} style={backBtn}>← Wstecz</button>
                <button type="button" onClick={() => setActiveTab("location")} style={nextBtn}>
                  Dalej: Lokalizacja <ChevronRight size={16} />
                </button>
              </div>
            </>}

            {activeTab === "location" && <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                <div>
                  <label style={lbl}>Miasto *</label>
                  <input name="city" value={form.city} onChange={handleChange} required
                    placeholder="np. Suwałki" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Nazwa miejsca</label>
                  <input name="venue_name" value={form.venue_name} onChange={handleChange}
                    placeholder="np. Dom Kultury" style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Adres</label>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <input name="address" value={form.address} onChange={handleChange}
                    placeholder="ul. Kościuszki 1 lub 54.10, 22.93" style={{...inp,flex:1}} />
                  <button type="button" onClick={handleGeocode} disabled={geocoding} style={geoBtn}>
                    {geocoding ? "..." : "📍 Znajdź"}
                  </button>
                </div>
                <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:4}}>Wpisz adres (np. ul. Kościuszki 1) lub wklej współrzędne (54.10, 22.93) i kliknij "Znajdź". Możesz też zaznaczyć punkt bezpośrednio na mapie.</div>
              </div>

              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) => setForm(prev => ({...prev, latitude: lat, longitude: lng}))}
              />

              <div style={{display:"flex",justifyContent:"space-between"}}>
                <button type="button" onClick={() => setActiveTab("schedule")} style={backBtn}>← Wstecz</button>
                <button type="button" onClick={() => setActiveTab("media")} style={nextBtn}>
                  Dalej: Zdjęcia <ChevronRight size={16} />
                </button>
              </div>
            </>}

            {activeTab === "media" && <>
              <div>
                <label style={lbl}>Zdjęcie</label>
                <ImageUpload
                  currentUrl={form.cover_image_url}
                  onUploadComplete={(url) => setForm(prev => ({ ...prev, cover_image_url: url }))}
                />
                <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0"}}>
                  <div style={{flex:1,height:1,background:"#e5e7eb"}} />
                  <span style={{fontSize:"0.75rem",color:"#9ca3af"}}>albo</span>
                  <div style={{flex:1,height:1,background:"#e5e7eb"}} />
                </div>
                <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange}
                  placeholder="Wklej link https://..." style={inp} />
                <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:4}}>Wgraj zdjęcie z dysku (max 5MB) lub wklej bezpośredni link.</div>
              </div>

              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="podgląd"
                  style={{width:"100%",height:200,objectFit:"cover",borderRadius:10}} />
              )}

              <div>
                <label style={lbl}>Plakat wydarzenia <span style={{fontWeight:400,color:"#9ca3af"}}>(opcjonalnie, jeśli masz osobny od zdjęcia)</span></label>
                <ImageUpload
                  currentUrl={form.image_url}
                  onUploadComplete={(url) => setForm(prev => ({ ...prev, image_url: url }))}
                />
                <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0"}}>
                  <div style={{flex:1,height:1,background:"#e5e7eb"}} />
                  <span style={{fontSize:"0.75rem",color:"#9ca3af"}}>albo</span>
                  <div style={{flex:1,height:1,background:"#e5e7eb"}} />
                </div>
                <input name="image_url" value={form.image_url} onChange={handleChange}
                  placeholder="Wklej link https://..." style={inp} />
                <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:4}}>Jeśli nie dodasz, w przycisku "Plakat" pokaże się zdjęcie powyżej.</div>
              </div>

              {form.image_url && (
                <img src={form.image_url} alt="podgląd plakatu"
                  style={{width:"100%",maxHeight:280,objectFit:"contain",borderRadius:10,background:"#f3f4f6"}} />
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                <div>
                  <label style={lbl}>Link do biletów</label>
                  <input name="ticket_url" value={form.ticket_url} onChange={handleChange}
                    placeholder="https://..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Strona www organizatora</label>
                  <input name="website_url" value={form.website_url} onChange={handleChange}
                    placeholder="https://..." style={inp} />
                </div>
              </div>

              {error && <p style={{color:"#ef4444",fontSize:"0.875rem",margin:0}}>{error}</p>}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"0.5rem",borderTop:"1px solid #f3f4f6"}}>
                <button type="button" onClick={() => setActiveTab("location")} style={backBtn}>← Wstecz</button>
                <button type="submit" disabled={submitting} style={{
                  display:"flex",alignItems:"center",gap:8,
                  padding:"0.8rem 2rem",background:"#16a34a",color:"white",
                  border:"none",borderRadius:10,cursor:"pointer",
                  fontWeight:700,fontSize:"1rem",opacity:submitting ? 0.7 : 1,
                }}>
                  {submitting ? "Wysyłanie..." : "✅ Wyślij do weryfikacji"}
                </button>
              </div>
            </>}

          </form>
        </div>

        <p style={{textAlign:"center",color:"#9ca3af",fontSize:"0.8rem",marginTop:"1.5rem"}}>
          Zgłaszając wydarzenie akceptujesz{" "}
          <Link href="/regulamin" style={{color:"#16a34a",textDecoration:"underline"}}>regulamin serwisu</Link>{" "}
          oraz{" "}
          <Link href="/polityka-prywatnosci" style={{color:"#16a34a",textDecoration:"underline"}}>politykę prywatności</Link>.
          {" "}Evently zastrzega sobie prawo do odmowy publikacji.
        </p>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {display:"block",fontSize:"0.875rem",fontWeight:500,color:"#374151",marginBottom:6}
const inp: React.CSSProperties = {padding:"0.65rem 0.75rem",borderRadius:8,border:"1px solid #e5e7eb",fontSize:"0.9rem",width:"100%",boxSizing:"border-box",outline:"none"}
const counter: React.CSSProperties = {fontSize:"0.75rem",color:"#9ca3af",textAlign:"right",marginTop:4}
const geoBtn: React.CSSProperties = {padding:"0.65rem 0.75rem",borderRadius:8,border:"1px solid #e5e7eb",background:"#f3f4f6",cursor:"pointer",fontSize:"0.85rem",whiteSpace:"nowrap"}
const nextBtn: React.CSSProperties = {display:"flex",alignItems:"center",gap:6,padding:"0.7rem 1.25rem",background:"#16a34a",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:"0.9rem"}
const backBtn: React.CSSProperties = {padding:"0.7rem 1.25rem",background:"white",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:"0.9rem",color:"#6b7280"}
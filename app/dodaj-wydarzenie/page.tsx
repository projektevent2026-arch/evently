"use client"

import PosterScanner from "@/components/admin/PosterScanner"
import ImageUpload from "@/components/admin/ImageUpload"
import ScheduleEditor from "@/components/admin/ScheduleEditor"
import dynamic from "next/dynamic"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { MapPin, ChevronRight, CheckCircle } from "lucide-react"
import Link from "next/link"
import { classifySchedule, describeSchedule, type DateEntry } from "@/lib/scheduleType"

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
  const [dates, setDates] = useState<DateEntry[]>([{ date: "", from: "", to: "" }])
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
  const [currentVariant, setCurrentVariant] = useState<"concise" | "rich" | "original" | null>(null)

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

    // Cykl: (nic/oryginał) -> zwięzła -> bogata -> oryginał -> zwięzła -> ...
    const nextVariant: "concise" | "rich" | "original" =
      (currentVariant === null || currentVariant === "original" || manuallyEdited) ? "concise"
      : currentVariant === "concise" ? "rich"
      : "original"

    // Oryginał to zawsze darmowy, lokalny podgląd — nigdy nie pytamy o niego AI.
    if (nextVariant === "original") {
      setForm(prev => ({ ...prev, description: baseText }))
      setCurrentVariant("original")
      return
    }

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
    ? "📝 Pokaż oryginał"
    : currentVariant === "original"
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


// Walidacja: przynajmniej jeden termin z datą
const validDates = dates.filter(d => d.date)
if (validDates.length === 0) {
  setError("Podaj przynajmniej jeden termin wydarzenia.")
  setActiveTab("basic")
  return
}

// Walidacja: żaden termin nie może być z przeszłości
if (validDates.some(d => d.date < todayStr())) {
  setError("Termin nie może być z przeszłości.")
  setActiveTab("basic")
  return
}

// Walidacja: każdy termin musi mieć godzinę rozpoczęcia
if (validDates.some(d => !d.from)) {
  setError("Każdy termin musi mieć godzinę \"Od\".")
  setActiveTab("basic")
  return
}

setSubmitting(true)
setError("")

const sortedDates = [...validDates].sort((a, b) => a.date.localeCompare(b.date))
const scheduleType = classifySchedule(dates)

try {
  const first = sortedDates[0]
  const last = sortedDates[sortedDates.length - 1]
  const start = first.date + "T" + first.from
  const end = last.date !== first.date
    ? (last.from ? last.date + "T" + last.from : last.date)
    : null

    const { data: savedEvent, error: supabaseError } = await supabase.from("events").insert([{
      title: form.title,
      slug: generateSlug(form.title),
      description: form.description || null,
      short_description: generateShortDescription(form.description) || null,
      start_date: start,
      end_date: end,
      schedule_type: scheduleType,
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
    }]).select("id").single()

    if (supabaseError) {
      setError("Błąd zapisu: " + supabaseError.message)
      setSubmitting(false)
      return
    }

    if (savedEvent?.id) {
      const rows = sortedDates.map(d => ({
        event_id: savedEvent.id,
        date: d.date,
        start_time: d.from || null,
        end_time: d.to || null,
        starts_at: d.from ? `${d.date}T${d.from}:00` : `${d.date}T00:00:00`,
      }))
      const { error: datesError } = await supabase.from("event_dates").insert(rows)
      if (datesError) {
        setError("Wydarzenie zapisane, ale wystąpił błąd zapisu terminów: " + datesError.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitted(true)
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
                        description: data.description || prev.description,
                        organizer_name: data.organizer_name || prev.organizer_name,
                        category: data.category || prev.category,
                        is_free: data.is_free ?? prev.is_free,
                        price_from: data.price_from?.toString() || prev.price_from,
                      }))
                      if (Array.isArray(data.dates) && data.dates.length > 0) {
                        setDates(data.dates.map((d: any) => ({
                          date: d.date || "",
                          from: d.start_time || "",
                          to: d.end_time || "",
                        })))
                      } else if (data.start_date) {
                        // fallback dla starszych odpowiedzi API bez pola dates
                        setDates([{
                          date: data.start_date,
                          from: data.start_time || "",
                          to: data.end_time || "",
                        }])
                      }
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
                <label style={lbl}>Terminy *</label>
                <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:10,lineHeight:1.5}}>
                  Jeden termin albo kilka dni — każdy dzień jako osobny termin. Rozpoznamy, czy to impreza jedno- czy kilkudniowa.
                </div>
                {dates.map((en, i) => (
                  <div key={i} style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:12,marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:"0.04em",textTransform:"uppercase"}}>Termin {i+1}</span>
                      <button type="button" disabled={dates.length === 1}
                        onClick={() => setDates(dates.filter((_, j) => j !== i))}
                        style={{border:"none",background:"none",color: dates.length === 1 ? "#e5e7eb" : "#ef4444",fontSize:16,cursor: dates.length === 1 ? "default" : "pointer",padding:"2px 4px",lineHeight:1}}>✕</button>
                    </div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Data</div>
                    <input type="date" min={todayStr()} value={en.date}
                      onChange={e => setDates(dates.map((d, j) => j === i ? { ...d, date: e.target.value } : d))} style={inp} />
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                      <div>
                        <div style={{fontSize:"0.75rem",color: en.date && !en.from ? "#ef4444" : "#9ca3af",marginBottom:4,fontWeight: en.date && !en.from ? 700 : 400}}>Od godziny {en.date && !en.from ? "*" : ""}</div>
                        <input type="time" value={en.from}
                          onChange={e => setDates(dates.map((d, j) => j === i ? { ...d, from: e.target.value } : d))}
                          style={en.date && !en.from ? { ...inp, borderColor:"#ef4444" } : inp} />
                      </div>
                      <div>
                        <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:4}}>Do godziny</div>
                        <input type="time" value={en.to}
                          onChange={e => setDates(dates.map((d, j) => j === i ? { ...d, to: e.target.value } : d))} style={inp} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setDates([...dates, { date:"", from: dates[dates.length-1]?.from || "", to: dates[dates.length-1]?.to || "" }])}
                  style={{width:"100%",padding:13,border:"1.5px dashed #cbd5e1",borderRadius:10,background:"white",color:"#6b7280",fontSize:"0.9rem",cursor:"pointer"}}>
                  + Dodaj termin
                </button>
                {(() => {
                  const info = describeSchedule(dates)
                  if (!info) return null
                  const warn = info.scheduleType === "recurring"
                  return (
                    <div style={{marginTop:14,padding:"13px 15px",borderRadius:10,background: warn ? "#fffbeb" : "#f0fdf4",border:`1px solid ${warn ? "#fde68a" : "#bbf7d0"}`,fontSize:13,lineHeight:1.5}}>
                      <span style={{fontWeight:700,color: warn ? "#b45309" : "#16a34a",display:"block",marginBottom:3}}>{info.kind}</span>
                      <span style={{color: warn ? "#92400e" : "#15803d"}}>{info.what}</span>
                    </div>
                  )
                })()}
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
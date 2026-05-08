"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, MapPin, Trash2, X, ChevronRight } from "lucide-react"

const CATEGORIES = ["culture","music","food","sport","family","technology"]
const CATEGORY_LABELS: Record<string,string> = {
  culture:"Kultura", music:"Muzyka", food:"Jedzenie",
  sport:"Sport", family:"Rodzinne", technology:"Technologia"
}
const STATUS_LABELS: Record<string,{label:string;color:string;bg:string}> = {
  published:{label:"Opublikowane",color:"#16a34a",bg:"#f0fdf4"},
  draft:{label:"Szkic",color:"#6b7280",bg:"#f3f4f6"},
  archived:{label:"Archiwum",color:"#9ca3af",bg:"#f9fafb"},
}
const emptyForm = {
  title:"", slug:"", description:"", short_description:"",
  start_date:"", start_time:"", end_date:"", end_time:"",
  city:"", address:"", venue_name:"",
  category:"culture", cover_image_url:"", ticket_url:"", website_url:"",
  organizer_name:"", price_from:"0", is_free:true,
  latitude:"", longitude:"", status:"published",
}

export default function AdminPage() {
  const [events, setEvents] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [statusMsg, setStatusMsg] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [filterStatus, setFilterStatus] = useState("all")
  const [mobileShowList, setMobileShowList] = useState(true)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from("events").select("*").order("start_date",{ascending:false})
    setEvents(data || [])
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
      ...(name === "is_free" && checked ? {price_from:"0"} : {}),
    }))
  }

  const handleGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(", ")
    if (!query) return
    setGeocoding(true)
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(query) + "&limit=1")
      const data = await res.json()
      if (data[0]) setForm(prev => ({...prev, latitude: parseFloat(data[0].lat).toFixed(6), longitude: parseFloat(data[0].lon).toFixed(6)}))
    } catch {}
    setGeocoding(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg("Zapisywanie...")
    const start = form.start_date && form.start_time ? form.start_date + "T" + form.start_time : form.start_date
    const end = form.end_date && form.end_time ? form.end_date + "T" + form.end_time : (form.end_date || null)
    const { error } = await supabase.from("events").insert([{
      title: form.title, slug: form.slug,
      description: form.description || null,
      short_description: form.short_description || null,
      start_date: start, end_date: end,
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
    }])
    if (error) { setStatusMsg("Blad: " + error.message) }
    else { setStatusMsg("Dodano!"); setForm(emptyForm); setShowForm(false); fetchEvents() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunac wydarzenie?")) return
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

  const openForm = () => { setForm(emptyForm); setActiveTab("basic"); setStatusMsg(""); setShowForm(true); setMobileShowList(false) }
  const closeForm = () => { setShowForm(false); setMobileShowList(true) }

  return (
    <div style={{display:"flex", minHeight:"100vh", fontFamily:"sans-serif", background:"#f9fafb"}}>

      {/* Sidebar - hidden on mobile */}
      <aside style={{width:220, background:"white", borderRight:"1px solid #e5e7eb", padding:"1.5rem 1rem", flexDirection:"column", gap:"0.5rem", display:"flex"}} className="admin-sidebar">
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:"1.5rem"}}>
          <div style={{width:32, height:32, borderRadius:8, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{fontWeight:700, fontSize:"1.1rem", color:"#16a34a"}}>evently</span>
        </div>
        <a href="/" style={navItem(false)}>Panel glowny</a>
        <a href="/admin" style={navItem(true)}>Wydarzenia</a>
        <button onClick={openForm} style={{...navItem(false), border:"none", textAlign:"left", cursor:"pointer"}}>Dodaj wydarzenie</button>
      </aside>

      {/* Main content */}
      <main style={{flex:1, padding:"1.5rem", minWidth:0}}>

        {/* Header */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem"}}>
          <div>
            <h1 style={{fontSize:"1.4rem", fontWeight:700, margin:0}}>Wydarzenia</h1>
            <p style={{color:"#6b7280", fontSize:"0.85rem", margin:"4px 0 0"}}>Zarzadzaj wszystkimi wydarzeniami</p>
          </div>
          <button onClick={openForm} style={{display:"flex", alignItems:"center", gap:6, background:"#16a34a", color:"white", border:"none", borderRadius:8, padding:"0.6rem 1rem", cursor:"pointer", fontWeight:600, fontSize:"0.875rem"}}>
            <Plus size={16} /> Dodaj wydarzenie
          </button>
        </div>

        {/* Status tabs */}
        <div style={{display:"flex", gap:"1rem", marginBottom:"1rem", borderBottom:"1px solid #e5e7eb", paddingBottom:"0.75rem", overflowX:"auto"}}>
          {(["all","published","draft","archived"] as const).map(val => (
            <button key={val} onClick={() => setFilterStatus(val)} style={{
              background:"none", border:"none", cursor:"pointer", fontSize:"0.875rem", whiteSpace:"nowrap",
              fontWeight: filterStatus === val ? 600 : 400,
              color: filterStatus === val ? "#16a34a" : "#6b7280",
              borderBottom: filterStatus === val ? "2px solid #16a34a" : "2px solid transparent",
              paddingBottom:"0.5rem",
            }}>
              {val === "all" ? "Wszystkie" : val === "published" ? "Opublikowane" : val === "draft" ? "Szkice" : "Archiwum"} <span style={{fontSize:"0.75rem", color:"#9ca3af"}}>{counts[val]}</span>
            </button>
          ))}
        </div>

        {/* Events table */}
        <div style={{background:"white", borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", minWidth:500}}>
              <thead>
                <tr style={{background:"#f9fafb", borderBottom:"1px solid #e5e7eb"}}>
                  <th style={th}>Wydarzenie</th>
                  <th style={th}>Data</th>
                  <th style={th}>Status</th>
                  <th style={th}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(event => (
                  <tr key={event.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                    <td style={td}>
                      <div style={{display:"flex", alignItems:"center", gap:12}}>
                        <img src={event.cover_image_url || "/images/event-concert.jpg"} alt={event.title}
                          style={{width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0}} />
                        <div>
                          <p style={{fontWeight:600, margin:0, fontSize:"0.875rem"}}>{event.title}</p>
                          <p style={{color:"#6b7280", margin:0, fontSize:"0.8rem"}}>{event.address || event.city}</p>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <p style={{margin:0, fontSize:"0.875rem"}}>{event.start_date ? new Date(event.start_date).toLocaleDateString("pl-PL") : "-"}</p>
                      <p style={{color:"#6b7280", margin:0, fontSize:"0.8rem"}}>
                        {event.start_date ? new Date(event.start_date).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}) : ""}
                        {event.end_date ? " - " + new Date(event.end_date).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}) : ""}
                      </p>
                    </td>
                    <td style={td}>
                      <span style={{padding:"2px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600,
                        background: STATUS_LABELS[event.status]?.bg || "#f3f4f6",
                        color: STATUS_LABELS[event.status]?.color || "#6b7280"}}>
                        {STATUS_LABELS[event.status]?.label || event.status}
                      </span>
                    </td>
                    <td style={td}>
                      <button onClick={() => handleDelete(event.id)} style={{background:"none", border:"none", color:"#ef4444", cursor:"pointer"}}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{textAlign:"center", padding:"2rem", color:"#9ca3af"}}>Brak wydarzen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Form panel - slide in from right */}
      {showForm && (
        <div style={{position:"fixed", inset:0, zIndex:50, display:"flex", justifyContent:"flex-end"}}>
          <div onClick={closeForm} style={{position:"absolute", inset:0, background:"rgba(0,0,0,0.3)"}} />
          <div style={{position:"relative", width:"100%", maxWidth:480, background:"white", boxShadow:"-4px 0 24px rgba(0,0,0,0.1)", display:"flex", flexDirection:"column", height:"100%", overflowY:"auto", animation:"slideIn 0.25s ease-out"}}>

            {/* Form header */}
            <div style={{padding:"1.25rem 1.5rem", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"white", zIndex:1}}>
              <h2 style={{margin:0, fontSize:"1.1rem", fontWeight:700}}>Dodaj wydarzenie</h2>
              <button onClick={closeForm} style={{background:"none", border:"none", cursor:"pointer", color:"#6b7280", padding:4}}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{display:"flex", borderBottom:"1px solid #e5e7eb", padding:"0 1.5rem"}}>
              {[["basic","Podstawowe informacje"], ["location","Lokalizacja"], ["media","Zdjecia i grafiki"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background:"none", border:"none", cursor:"pointer", fontSize:"0.85rem", padding:"0.75rem 0", marginRight:"1.5rem",
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "#16a34a" : "#6b7280",
                  borderBottom: activeTab === tab ? "2px solid #16a34a" : "2px solid transparent",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem", flex:1}}>

              {activeTab === "basic" && <>
                <div>
                  <label style={lbl}>Nazwa wydarzenia *</label>
                  <input name="title" placeholder="Wpisz nazwe wydarzenia" value={form.title} onChange={handleChange} required style={inp} maxLength={100} />
                  <div style={counter}>{form.title.length}/100</div>
                </div>

                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                  <div>
                    <label style={lbl}>Kategoria *</label>
                    <select name="category" value={form.category} onChange={handleChange} style={inp}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Status</label>
                    <select name="status" value={form.status} onChange={handleChange} style={inp}>
                      <option value="published">Opublikowane</option>
                      <option value="draft">Szkic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Data i godzina</label>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", marginBottom:"0.5rem"}}>
                    <div>
                      <div style={{fontSize:"0.75rem", color:"#9ca3af", marginBottom:4}}>Data rozpoczecia</div>
                      <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required style={inp} />
                    </div>
                    <div>
                      <div style={{fontSize:"0.75rem", color:"#9ca3af", marginBottom:4}}>Godzina rozpoczecia</div>
                      <input name="start_time" type="time" value={form.start_time} onChange={handleChange} style={inp} />
                    </div>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem"}}>
                    <div>
                      <div style={{fontSize:"0.75rem", color:"#9ca3af", marginBottom:4}}>Data zakonczenia</div>
                      <input name="end_date" type="date" value={form.end_date} onChange={handleChange} style={inp} />
                    </div>
                    <div>
                      <div style={{fontSize:"0.75rem", color:"#9ca3af", marginBottom:4}}>Godzina zakonczenia</div>
                      <input name="end_time" type="time" value={form.end_time} onChange={handleChange} style={inp} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Krotki opis *</label>
                  <textarea name="short_description" placeholder="Napisz krotki opis wydarzenia..." value={form.short_description} onChange={handleChange} style={{...inp, height:80, resize:"vertical"}} maxLength={200} />
                  <div style={counter}>{form.short_description.length}/200</div>
                </div>

                <div>
                  <label style={lbl}>Pelny opis</label>
                  <textarea name="description" placeholder="Opisz szczegoly wydarzenia..." value={form.description} onChange={handleChange} style={{...inp, height:120, resize:"vertical"}} maxLength={2000} />
                  <div style={counter}>{form.description.length}/2000</div>
                </div>

                <div>
                  <label style={lbl}>Organizator</label>
                  <input name="organizer_name" placeholder="Nazwa organizatora" value={form.organizer_name} onChange={handleChange} style={inp} />
                </div>

                <label style={{display:"flex", alignItems:"center", gap:8, fontSize:"0.9rem", cursor:"pointer"}}>
                  <input name="is_free" type="checkbox" checked={form.is_free} onChange={handleChange} />
                  Wstep wolny
                </label>
                {!form.is_free && (
                  <div>
                    <label style={lbl}>Cena od (PLN)</label>
                    <input name="price_from" type="number" min="0" step="0.01" value={form.price_from} onChange={handleChange} style={inp} />
                  </div>
                )}
              </>}

              {activeTab === "location" && <>
                <div>
                  <label style={lbl}>Miasto *</label>
                  <input name="city" placeholder="np. Suwalki" value={form.city} onChange={handleChange} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Nazwa miejsca</label>
                  <input name="venue_name" placeholder="np. Dom Kultury" value={form.venue_name} onChange={handleChange} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Adres</label>
                  <div style={{display:"flex", gap:"0.5rem"}}>
                    <input name="address" placeholder="ul. Kosciuszki 1" value={form.address} onChange={handleChange} style={{...inp, flex:1}} />
                    <button type="button" onClick={handleGeocode} disabled={geocoding} style={geoBtn}>
                      {geocoding ? "..." : "Geocode"}
                    </button>
                  </div>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem"}}>
                  <div>
                    <label style={lbl}>Latitude</label>
                    <input name="latitude" placeholder="54.1116" value={form.latitude} onChange={handleChange} style={{...inp, background:"#f9f9f9"}} />
                  </div>
                  <div>
                    <label style={lbl}>Longitude</label>
                    <input name="longitude" placeholder="22.9302" value={form.longitude} onChange={handleChange} style={{...inp, background:"#f9f9f9"}} />
                  </div>
                </div>
              </>}

              {activeTab === "media" && <>
                <div>
                  <label style={lbl}>URL zdjecia okladki</label>
                  <input name="cover_image_url" placeholder="https://..." value={form.cover_image_url} onChange={handleChange} style={inp} />
                </div>
                {form.cover_image_url && (
                  <img src={form.cover_image_url} alt="preview" style={{width:"100%", height:180, objectFit:"cover", borderRadius:8}} />
                )}
                <div>
                  <label style={lbl}>Link do biletow</label>
                  <input name="ticket_url" placeholder="https://..." value={form.ticket_url} onChange={handleChange} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Strona www</label>
                  <input name="website_url" placeholder="https://..." value={form.website_url} onChange={handleChange} style={inp} />
                </div>
              </>}

              {statusMsg && <p style={{color: statusMsg.includes("lad") ? "#ef4444" : "#16a34a", fontSize:"0.875rem", margin:0}}>{statusMsg}</p>}

              {/* Footer buttons */}
              <div style={{display:"flex", gap:"0.75rem", marginTop:"auto", paddingTop:"1rem", borderTop:"1px solid #e5e7eb"}}>
                <button type="button" onClick={closeForm} style={{flex:1, padding:"0.7rem", border:"1px solid #e5e7eb", borderRadius:8, background:"white", cursor:"pointer", fontSize:"0.9rem"}}>
                  Zapisz szkic
                </button>
                <button type="submit" style={{flex:1, padding:"0.7rem", background:"#16a34a", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center", gap:6}}>
                  Dalej <ChevronRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const navItem = (active: boolean): React.CSSProperties => ({
  padding:"0.6rem 0.75rem", borderRadius:8, fontSize:"0.9rem",
  background: active ? "#f0fdf4" : "transparent",
  color: active ? "#16a34a" : "#374151",
  fontWeight: active ? 600 : 400,
  cursor:"pointer", textDecoration:"none", display:"block"
})
const th: React.CSSProperties = {padding:"0.75rem 1rem", textAlign:"left", fontSize:"0.8rem", fontWeight:600, color:"#6b7280"}
const td: React.CSSProperties = {padding:"0.75rem 1rem", verticalAlign:"middle"}
const inp: React.CSSProperties = {padding:"0.65rem 0.75rem", borderRadius:8, border:"1px solid #e5e7eb", fontSize:"0.9rem", width:"100%", boxSizing:"border-box", outline:"none"}
const lbl: React.CSSProperties = {display:"block", fontSize:"0.85rem", fontWeight:500, color:"#374151", marginBottom:6}
const counter: React.CSSProperties = {fontSize:"0.75rem", color:"#9ca3af", textAlign:"right", marginTop:4}
const geoBtn: React.CSSProperties = {padding:"0.65rem 0.75rem", borderRadius:8, border:"1px solid #e5e7eb", background:"#f3f4f6", cursor:"pointer", fontSize:"0.85rem", whiteSpace:"nowrap"}

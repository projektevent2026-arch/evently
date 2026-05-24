"use client"

import EventSchedule from '@/components/EventSchedule'
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import dynamic from "next/dynamic"

const EventMap = dynamic(() => import("@/components/event-map").then(m => m.EventMap), { ssr: false })

const CATEGORY_LABELS: Record<string,string> = {
  culture:"Kultura", music:"Muzyka", food:"Jedzenie",
  sport:"Sport", family:"Rodzinne", technology:"Technologia", festiwal:"Festiwal"
}

export default function EventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [going, setGoing] = useState(false)
  const [interestedCount, setInterestedCount] = useState(0)
  const [activeTab, setActiveTab] = useState("details")
  const [similarEvents, setSimilarEvents] = useState<any[]>([])

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()
      if (!error) {
        setEvent(data)
        setInterestedCount(data.view_count || 0)
        // Pobierz podobne wydarzenia
        const { data: similar } = await supabase
          .from("events")
          .select("*")
          .eq("status", "published")
          .neq("slug", slug)
          .limit(4)
        setSimilarEvents(similar || [])
      }
      setLoading(false)
    }
    fetchEvent()
  }, [slug])

  const handleGoing = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = "/login"; return }
    const userId = session.user.id
    const eventId = event.id
    if (going) {
      await supabase.from("event_attendees").delete().eq("user_id", userId).eq("event_id", eventId)
      setGoing(false)
      setInterestedCount((prev: number) => prev - 1)
    } else {
      await supabase.from("event_attendees").insert({ user_id: userId, event_id: eventId })
      setGoing(true)
      setInterestedCount((prev: number) => prev + 1)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.title, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("pl-PL", { weekday:"long", day:"numeric", month:"long", year:"numeric" })
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleTimeString("pl-PL", { hour:"2-digit", minute:"2-digit" })
  }

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return { day: d.getDate(), month: d.toLocaleDateString("pl-PL", { month:"short" }).toUpperCase() }
  }

  const isToday = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }

  const isTomorrow = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return d.toDateString() === tomorrow.toDateString()
  }

  const getDateBadge = (dateStr: string) => {
    if (isToday(dateStr)) return "DZIŚ"
    if (isTomorrow(dateStr)) return "JUTRO"
    return null
  }

  if (loading) return (
    <div style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid #e5e7eb", borderTopColor:"#16a34a", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
        <p style={{ color:"#6b7280", fontSize:14 }}>Ładowanie...</p>
      </div>
    </div>
  )

  if (!event) return (
    <div style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"#6b7280" }}>Nie znaleziono wydarzenia.</p>
    </div>
  )

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.address, event.city].filter(Boolean).join(", "))}`
  const dateBadge = getDateBadge(event.start_date)
  const shortDate = formatShortDate(event.start_date)

  return (
    <main style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 12px 4px; font-size: 14px; font-weight: 500; color: #9ca3af; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; }
        .tab-btn.active { color: #16a34a; border-bottom-color: #16a34a; font-weight: 700; }
        .similar-card:hover { transform: translateY(-2px); transition: transform 0.2s; }
      `}</style>

      {/* HERO */}
      <div style={{ position:"relative", height:420, overflow:"hidden" }}>
        <img
          src={event.cover_image_url || "/images/event-concert.jpg"}
          alt={event.title}
          style={{ width:"100%", height:"100%", objectFit:"cover" }}
        />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)" }} />

        {/* Nawigacja top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(8px)", color:"white", padding:"8px 14px", borderRadius:24, fontSize:13, fontWeight:500, textDecoration:"none", border:"1px solid rgba(255,255,255,0.15)" }}>
            ← Wróć do wydarzeń
          </Link>
          <button onClick={handleShare} style={{ width:38, height:38, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }}>
            🔗
          </button>
        </div>

        {/* Badge data + czas */}
        <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:8 }}>
          {dateBadge && (
            <span style={{ background:"#16a34a", color:"white", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, letterSpacing:0.5 }}>
              {dateBadge}
            </span>
          )}
          {event.start_date && (
            <span style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)", color:"white", fontSize:12, fontWeight:500, padding:"4px 10px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)" }}>
              🕐 {formatTime(event.start_date)}
            </span>
          )}
        </div>

        {/* Info na zdjęciu - dół */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"20px" }}>
          
          {/* Kategoria */}
          {event.category && (
            <span style={{ display:"inline-block", background:"#16a34a", color:"white", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, marginBottom:8, letterSpacing:0.5 }}>
              {CATEGORY_LABELS[event.category] || event.category}
            </span>
          )}

          {/* Tytuł */}
          <h1 style={{ color:"white", fontSize:34, fontWeight:800, margin:"0 0 6px", lineHeight:1.2, textShadow:"0 2px 8px rgba(0,0,0,0.5)" }}>
            {event.title}
          </h1>

          {/* Krótki opis */}
          {event.short_description && (
            <p style={{ color:"rgba(255,255,255,0.85)", fontSize:14, margin:"0 0 10px", lineHeight:1.5, maxWidth:600 }}>
              {event.short_description}
            </p>
          )}

          {/* Lokalizacja */}
          <div style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,0.85)", fontSize:13, marginBottom:14 }}>
            📍 {[event.venue_name, event.address, event.city].filter(Boolean).join(", ")}
          </div>

          {/* Uczestnicy + przyciski */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex" }}>
                {["#f59e0b","#16a34a","#2563eb","#dc2626"].map((c, i) => (
                  <div key={i} style={{ width:28, height:28, borderRadius:"50%", background:c, border:"2px solid white", marginLeft: i === 0 ? 0 : -8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"white", fontWeight:700 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span style={{ color:"white", fontSize:13, fontWeight:500 }}>{interestedCount} zainteresowanych</span>
            </div>
            
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={handleGoing}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 28px", background: going ? "white" : "#16a34a", color: going ? "#16a34a" : "white", border: going ? "none" : "none", borderRadius:24, fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(0,0,0,0.3)" }}
              >
                👥 {going ? "Idę ✓" : "Idę"}
              </button>
              <button onClick={handleShare} style={{ padding:"12px 20px", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", color:"white", border:"1px solid rgba(255,255,255,0.3)", borderRadius:24, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                🔗 Udostępnij
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 16px" }}>
        
        {/* Dwie kolumny na desktopie */}
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:24, paddingTop:24, alignItems:"start" }}>
          
          {/* LEWA: Szczegóły */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            
            <div style={{ background:"white", borderRadius:16, border:"1px solid #e5e7eb", padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#111827", margin:"0 0 16px" }}>Szczegóły wydarzenia</h3>
              
              {/* Data */}
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>📅</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Data</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{formatDate(event.start_date)}</div>
                  {event.end_date && event.end_date !== event.start_date && (
                    <div style={{ fontSize:12, color:"#6b7280" }}>do {formatDate(event.end_date)}</div>
                  )}
                </div>
              </div>

              {/* Godzina */}
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🕐</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Godzina</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>
                    {formatTime(event.start_date)}
                    {event.end_date && ` – ${formatTime(event.end_date)}`}
                  </div>
                </div>
              </div>

              {/* Lokalizacja */}
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>📍</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Lokalizacja</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{event.address || event.city}</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{event.city}</div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#16a34a", fontWeight:600, textDecoration:"none", display:"inline-block", marginTop:4 }}>
                    Pokaż na mapie →
                  </a>
                </div>
              </div>

              {/* Kategoria */}
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🏷️</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Kategoria</div>
                  <span style={{ display:"inline-block", background:"#f0fdf4", color:"#16a34a", fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:20, border:"1px solid #bbf7d0", marginTop:4 }}>
                    {CATEGORY_LABELS[event.category] || event.category}
                  </span>
                </div>
              </div>

              {/* Wstęp */}
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🎟️</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Wstęp</div>
                  <div style={{ fontSize:12, color: event.is_free ? "#16a34a" : "#111827", fontWeight: event.is_free ? 600 : 400 }}>
                    {event.is_free ? "Wolny" : `Od ${event.price_from} PLN`}
                  </div>
                </div>
              </div>

              {/* Organizator */}
              {event.organizer_name && (
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🏛️</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>Organizator</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{event.organizer_name}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Dodaj do kalendarza */}
            <button style={{ width:"100%", padding:"11px", background:"white", border:"1px solid #e5e7eb", borderRadius:12, fontSize:13, color:"#374151", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📅 Dodaj do kalendarza
            </button>

            {/* Ticket URL */}
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{ display:"block", width:"100%", padding:"11px", background:"#16a34a", border:"none", borderRadius:12, fontSize:13, color:"white", cursor:"pointer", fontWeight:700, textAlign:"center", textDecoration:"none" }}>
                🎟️ Kup bilety
              </a>
            )}
          </div>

          {/* PRAWA: Opis + zakładki */}
          <div>
            
            {/* Zakładki */}
            <div style={{ display:"flex", gap:24, borderBottom:"1px solid #e5e7eb", marginBottom:20 }}>
              {[
                { id:"details", label:"Opis wydarzenia" },
                { id:"schedule", label:"Program" },
                { id:"location", label:"Lokalizacja" },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Zawartość zakładki */}
            {activeTab === "details" && (
              <div>
                <div style={{ background:"white", borderRadius:16, border:"1px solid #e5e7eb", padding:20, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                  {event.description ? (
                    <p style={{ fontSize:14, color:"#374151", lineHeight:1.8 }}>{event.description}</p>
                  ) : event.short_description ? (
                    <p style={{ fontSize:14, color:"#374151", lineHeight:1.8 }}>{event.short_description}</p>
                  ) : (
                    <p style={{ fontSize:14, color:"#9ca3af" }}>Brak opisu.</p>
                  )}
                </div>

                {event.is_free && (
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:"14px 16px", marginTop:16 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#16a34a", marginBottom:8 }}>Przydatne informacje</div>
                    <div style={{ fontSize:13, color:"#374151", display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>✅ Wstęp wolny</div>
                    {event.venue_name && <div style={{ fontSize:13, color:"#374151", display:"flex", alignItems:"center", gap:8 }}>📍 {event.venue_name}</div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === "schedule" && (
              <div>
                {event.schedule && event.schedule.length > 0 ? (
                  <EventSchedule schedule={event.schedule} eventDate={event.start_date} />
                ) : (
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #e5e7eb", padding:"40px 20px", textAlign:"center", color:"#9ca3af" }}>
                    Brak programu dla tego wydarzenia
                  </div>
                )}
              </div>
            )}

            {activeTab === "location" && (
              <div style={{ background:"white", borderRadius:16, border:"1px solid #e5e7eb", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <EventMap city={event.city} location={event.address} latitude={event.latitude} longitude={event.longitude} />
                <div style={{ padding:"14px 16px", borderTop:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{event.address || event.city}</div>
                    {event.city && event.address && <div style={{ fontSize:12, color:"#6b7280" }}>{event.city}</div>}
                  </div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#16a34a", fontWeight:600, textDecoration:"none" }}>
                    Nawiguj →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PODOBNE WYDARZENIA */}
        {similarEvents.length > 0 && (
          <div style={{ padding:"32px 0 40px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#111827", margin:0 }}>Podobne wydarzenia</h2>
              <Link href="/" style={{ fontSize:13, color:"#16a34a", fontWeight:600, textDecoration:"none" }}>Zobacz wszystkie →</Link>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
              {similarEvents.map(ev => {
                const sd = formatShortDate(ev.start_date)
                return (
                  <Link key={ev.id} href={`/events/${ev.slug}`} style={{ textDecoration:"none" }} className="similar-card">
                    <div style={{ background:"white", borderRadius:14, border:"1px solid #e5e7eb", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ position:"relative", height:110, overflow:"hidden" }}>
                        <img src={ev.cover_image_url || "/images/event-concert.jpg"} alt={ev.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                        <div style={{ position:"absolute", bottom:8, left:8, background:"white", borderRadius:8, padding:"4px 8px", textAlign:"center" }}>
                          <div style={{ fontSize:16, fontWeight:800, color:"#111827", lineHeight:1 }}>{sd.day}</div>
                          <div style={{ fontSize:9, fontWeight:700, color:"#16a34a", textTransform:"uppercase" }}>{sd.month}</div>
                        </div>
                        <div style={{ position:"absolute", top:8, left:8, background:"#16a34a", color:"white", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:10 }}>
                          {CATEGORY_LABELS[ev.category] || ev.category}
                        </div>
                      </div>
                      <div style={{ padding:"10px 12px" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:4, lineHeight:1.3 }}>{ev.title}</div>
                        <div style={{ fontSize:11, color:"#9ca3af", display:"flex", alignItems:"center", gap:4 }}>
                          📍 {ev.city}
                        </div>
                        <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>
                          👥 {ev.view_count || 0} osób idzie
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
"use client"

import { Calendar, Clock, MapPin, Tag, Ticket, Building2 } from "lucide-react"
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
  const [showPoster, setShowPoster] = useState(false)
  

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase.from("events").select("*").eq("slug", slug).single()
      if (!error) {
        setEvent(data)
        setInterestedCount(data.view_count || 0)
        const { data: similar } = await supabase.from("events").select("*").eq("status","published").neq("slug",slug).limit(4)
        setSimilarEvents(similar || [])
      }
      setLoading(false)
    }
    fetchEvent()
  }, [slug])

  const handleGoing = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = "/login"; return }
    if (going) {
      await supabase.from("event_attendees").delete().eq("user_id", session.user.id).eq("event_id", event.id)
      setGoing(false); setInterestedCount((p:number) => p-1)
    } else {
      await supabase.from("event_attendees").insert({ user_id: session.user.id, event_id: event.id })
      setGoing(true); setInterestedCount((p:number) => p+1)
    }
  }

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: event?.title, url: window.location.href })
    else navigator.clipboard.writeText(window.location.href)
  }

  const fmt = (d:string) => d ? new Date(d).toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""
  const fmtTime = (d:string) => d ? new Date(d).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}) : ""
  const fmtShort = (d:string) => { if(!d) return {day:"",month:""}; const dt=new Date(d); return {day:dt.getDate(), month:dt.toLocaleDateString("pl-PL",{month:"short"}).toUpperCase()} }
  const isToday = (d:string) => d ? new Date(d).toDateString()===new Date().toDateString() : false
  const isTomorrow = (d:string) => { if(!d) return false; const t=new Date(); t.setDate(t.getDate()+1); return new Date(d).toDateString()===t.toDateString() }

  if (loading) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280",fontSize:14}}>Ładowanie...</p></div>
  if (!event) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280"}}>Nie znaleziono wydarzenia.</p></div>

  const dateBadge = isToday(event.start_date) ? "DZIŚ" : isTomorrow(event.start_date) ? "JUTRO" : null
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.address,event.city].filter(Boolean).join(", "))}`

  return (
    <main style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"system-ui,sans-serif"}}>
      <style>{`
        .tab-btn { background:none; border:none; cursor:pointer; padding:14px 0; font-size:14px; font-weight:500; color:#9ca3af; border-bottom:2px solid transparent; transition:all 0.2s; white-space:nowrap; flex:1; text-align:center; }
        .tab-btn.active { color:#16a34a; border-bottom-color:#16a34a; font-weight:700; }
        .tab-btn:hover:not(.active) { color:#374151; }
        .similar-card { text-decoration:none; display:block; }
        .similar-card > div { transition:box-shadow 0.2s, transform 0.2s; }
        .similar-card:hover > div { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,0.12); }
        .detail-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid #f3f4f6; }
        .detail-item:last-child { border-bottom:none; padding-bottom:0; }
        .detail-icon-wrap { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:17px; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <div style={{position:"relative", aspectRatio:"21/9", minHeight:320, maxHeight:520, overflow:"hidden"}}>
        <img
          src={event.cover_image_url||"/images/event-concert.jpg"}
          alt={event.title}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}
        />
        {/* Gradient - mocny na dole, delikatny na górze */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.05) 100%)"}} />

        {/* Górna nawigacja */}
        <div style={{position:"absolute",top:0,left:0,right:0,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",padding:"8px 16px",borderRadius:24,fontSize:13,fontWeight:600,textDecoration:"none",border:"1px solid rgba(255,255,255,0.15)"}}>
            ← Wróć
          </Link>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {dateBadge && <span style={{background:"#16a34a",color:"white",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20,letterSpacing:0.3}}>{dateBadge}</span>}
            {event.start_date && <span style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",fontSize:12,padding:"5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)"}}>🕐 {fmtTime(event.start_date)}</span>}
          </div>
        </div>

        {/* Dolna sekcja hero - tytuł + przyciski */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"28px 24px"}}>
          {event.category && (
            <div style={{marginBottom:10}}>
              <span style={{background:"#16a34a",color:"white",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,letterSpacing:0.5}}>
                {CATEGORY_LABELS[event.category]||event.category}
              </span>
            </div>
          )}

          <h1 style={{color:"white",fontSize:"clamp(22px,4vw,36px)",fontWeight:800,margin:"0 0 8px",lineHeight:1.15,textShadow:"0 1px 8px rgba(0,0,0,0.4)"}}>
            {event.title}
          </h1>

          {event.short_description && (
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:14,margin:"0 0 14px",lineHeight:1.5,maxWidth:640,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
              {event.short_description}
            </p>
          )}

          <div style={{display:"flex",alignItems:"center",gap:6,color:"rgba(255,255,255,0.75)",fontSize:13,marginBottom:18}}>
            📍 {[event.venue_name,event.address,event.city].filter(Boolean).join(", ")}
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            {/* Uczestnicy */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex"}}>
                {["#f59e0b","#16a34a","#2563eb","#dc2626"].map((c,i) => (
                  <div key={i} style={{width:30,height:30,borderRadius:"50%",background:c,border:"2.5px solid rgba(255,255,255,0.9)",marginLeft:i===0?0:-10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:700}}>
                    {String.fromCharCode(65+i)}
                  </div>
                ))}
              </div>
              <span style={{color:"rgba(255,255,255,0.85)",fontSize:13,fontWeight:500}}>{interestedCount} zainteresowanych</span>
            </div>

            {/* Przyciski CTA */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleGoing} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"11px 26px",background:going?"white":"#16a34a",color:going?"#16a34a":"white",border:"2px solid "+(going?"white":"#16a34a"),borderRadius:26,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",transition:"all 0.15s"}}>
                👥 {going?"Idę ✓":"Idę"}
              </button>
              <button onClick={handleShare} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"11px 18px",background:"transparent",backdropFilter:"blur(12px)",color:"white",border:"2px solid rgba(255,255,255,0.45)",borderRadius:26,fontSize:15,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                🔗 Udostępnij
              </button>
              {event.image_url && (
  <button onClick={() => setShowPoster(true)} style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",padding:"8px 14px",borderRadius:24,fontSize:13,fontWeight:600,border:"1px solid rgba(255,255,255,0.15)",cursor:"pointer"}}>
    🖼️ Plakat
  </button>
)}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 20px 64px"}}>
        <div style={{display:"grid",gridTemplateColumns:"350px 1fr",gap:28,alignItems:"start"}}>

          {/* ─── LEWA: Szczegóły ─── */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* Karta szczegółów */}
            <div style={{background:"white",borderRadius:18,padding:"32px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
              <h3 style={{fontSize:16,fontWeight:700,color:"#111827",margin:"0 0 16px"}}>Szczegóły wydarzenia</h3>

              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#eff6ff"}}><Calendar size={17} color="#3b82f6" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Data</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{fmt(event.start_date)}</div>
                  {event.end_date && event.end_date!==event.start_date && <div style={{fontSize:13,color:"#6b7280",marginTop:1}}>do {fmt(event.end_date)}</div>}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#f0fdf4"}}><Clock size={17} color="#16a34a" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Godzina</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{fmtTime(event.start_date)}{event.end_date?` – ${fmtTime(event.end_date)}`:""}</div>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#fff7ed"}}><MapPin size={17} color="#f97316" /></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Lokalizacja</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.address||event.city}</div>
                  {event.city&&event.address&&<div style={{fontSize:13,color:"#6b7280",marginTop:1}}>{event.city}</div>}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",fontSize:13,color:"#16a34a",fontWeight:600,textDecoration:"none",marginTop:5}}>
                    Pokaż na mapie →
                  </a>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#f0fdf4"}}><Tag size={17} color="#16a34a" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Kategoria</div>
                  <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,border:"1px solid #bbf7d0"}}>
                    {CATEGORY_LABELS[event.category]||event.category}
                  </span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#fef9f0"}}><Ticket size={17} color="#f59e0b" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Wstęp</div>
                  <div style={{fontSize:14,fontWeight:700,color:event.is_free?"#16a34a":"#111827"}}>
                    {event.is_free?"Wolny":`Od ${event.price_from} PLN`}
                  </div>
                </div>
              </div>

              {event.organizer_name && (
                <div className="detail-item">
                  <div className="detail-icon-wrap" style={{background:"#f5f3ff"}}><Building2 size={17} color="#8b5cf6" /></div>
                  <div>
                    <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Organizator</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.organizer_name}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Dodaj do kalendarza */}
            <button style={{width:"100%",padding:"13px 16px",background:"white",border:"none",borderRadius:14,fontSize:14,color:"#374151",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
              📅 Dodaj do kalendarza
            </button>

            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",background:"#16a34a",borderRadius:14,fontSize:14,color:"white",fontWeight:700,textDecoration:"none",boxShadow:"0 4px 14px rgba(22,163,74,0.35)"}}>
                🎟️ Kup bilety
              </a>
            )}
          </div>

          {/* ─── PRAWA: Zakładki ─── */}
          <div style={{background:"white",borderRadius:18,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",overflow:"hidden"}}>
            {/* Tabs */}
            <div style={{display:"flex",borderBottom:"1px solid #f3f4f6"}}>
              {[{id:"details",label:"Opis wydarzenia"},{id:"schedule",label:"Program"},{id:"location",label:"Lokalizacja"}].map(tab => (
                <button key={tab.id} className={`tab-btn ${activeTab===tab.id?"active":""}`} onClick={()=>setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Zawartość zakładki */}
            <div style={{padding:"28px 28px"}}>
              {activeTab==="details" && (
                <div>
                  <p style={{fontSize:15,color:"#374151",lineHeight:1.85,margin:0}}>
                    {event.description||event.short_description||<span style={{color:"#9ca3af"}}>Brak opisu.</span>}
                  </p>
                  {event.is_free && (
                    <div style={{marginTop:24}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#16a34a",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                        ℹ️ Przydatne informacje
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#374151"}}>
                          <span style={{color:"#16a34a"}}>✓</span> Wstęp wolny
                        </div>
                        {event.venue_name && (
                          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#374151"}}>
                            <span style={{color:"#16a34a"}}>✓</span> {event.venue_name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab==="schedule" && (
                event.schedule&&event.schedule.length>0
                  ? <EventSchedule schedule={event.schedule} eventDate={event.start_date} />
                  : <div style={{textAlign:"center",padding:"48px 0",color:"#9ca3af",fontSize:14}}>Brak programu dla tego wydarzenia</div>
              )}

              {activeTab==="location" && (
                <div>
                  <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #f3f4f6"}}>
                    <EventMap city={event.city} location={event.address} latitude={event.latitude} longitude={event.longitude} />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,padding:"12px 0",borderTop:"1px solid #f3f4f6"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.address||event.city}</div>
                      {event.city&&event.address&&<div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{event.city}</div>}
                    </div>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#16a34a",fontWeight:700,textDecoration:"none"}}>Nawiguj →</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ PODOBNE WYDARZENIA ═══ */}
        {similarEvents.length>0 && (
          <div style={{marginTop:52}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:0}}>Podobne wydarzenia</h2>
              <Link href="/" style={{fontSize:14,color:"#16a34a",fontWeight:700,textDecoration:"none"}}>Zobacz wszystkie →</Link>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {similarEvents.map(ev => {
                const s = fmtShort(ev.start_date)
                return (
                  <Link key={ev.id} href={`/events/${ev.slug}`} className="similar-card">
                    <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                      <div style={{position:"relative",height:130,overflow:"hidden"}}>
                        <img src={ev.cover_image_url||"/images/event-concert.jpg"} alt={ev.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%)"}} />
                        <div style={{position:"absolute",bottom:10,left:10,background:"white",borderRadius:10,padding:"5px 9px",textAlign:"center",minWidth:42}}>
                          <div style={{fontSize:17,fontWeight:800,color:"#111827",lineHeight:1}}>{s.day}</div>
                          <div style={{fontSize:9,fontWeight:700,color:"#16a34a",textTransform:"uppercase"}}>{s.month}</div>
                        </div>
                        <div style={{position:"absolute",top:10,left:10,background:"#16a34a",color:"white",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10}}>
                          {CATEGORY_LABELS[ev.category]||ev.category}
                        </div>
                      </div>
                      <div style={{padding:"12px 14px"}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:5,lineHeight:1.3}}>{ev.title}</div>
                        <div style={{fontSize:12,color:"#9ca3af"}}>📍 {ev.city}</div>
                        <div style={{fontSize:12,color:"#9ca3af",marginTop:3}}>👥 {ev.view_count||0} osób idzie</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {showPoster && event.image_url && (
        <div onClick={() => setShowPoster(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,cursor:"pointer"}}>
          <img src={event.image_url} alt="Plakat" style={{maxHeight:"90vh",maxWidth:"90vw",objectFit:"contain",borderRadius:12}} onClick={e => e.stopPropagation()} />
          <button onClick={() => setShowPoster(false)} style={{position:"absolute",top:20,right:20,background:"#333",border:"none",color:"white",width:40,height:40,borderRadius:"50%",fontSize:20,cursor:"pointer"}}>×</button>
        </div>
      )}
    </main>
  )
}
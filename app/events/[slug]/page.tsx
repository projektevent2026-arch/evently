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
    const userId = session.user.id
    const eventId = event.id
    if (going) {
      await supabase.from("event_attendees").delete().eq("user_id", userId).eq("event_id", eventId)
      setGoing(false); setInterestedCount((p:number) => p-1)
    } else {
      await supabase.from("event_attendees").insert({ user_id: userId, event_id: eventId })
      setGoing(true); setInterestedCount((p:number) => p+1)
    }
  }

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: event.title, url: window.location.href })
    else navigator.clipboard.writeText(window.location.href)
  }

  const fmt = (d:string) => d ? new Date(d).toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""
  const fmtTime = (d:string) => d ? new Date(d).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}) : ""
  const fmtShort = (d:string) => { if(!d) return {day:"",month:""}; const dt=new Date(d); return {day:dt.getDate(), month:dt.toLocaleDateString("pl-PL",{month:"short"}).toUpperCase()} }
  const isToday = (d:string) => { if(!d) return false; return new Date(d).toDateString()===new Date().toDateString() }
  const isTomorrow = (d:string) => { if(!d) return false; const t=new Date(); t.setDate(t.getDate()+1); return new Date(d).toDateString()===t.toDateString() }
  const dateBadge = event ? (isToday(event.start_date) ? "DZIŚ" : isTomorrow(event.start_date) ? "JUTRO" : null) : null
  const mapsUrl = event ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.address,event.city].filter(Boolean).join(", "))}` : ""

  if (loading) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280"}}>Ładowanie...</p></div>
  if (!event) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280"}}>Nie znaleziono wydarzenia.</p></div>

  const sd = fmtShort(event.start_date)

  return (
    <main style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .tab-btn{background:none;border:none;cursor:pointer;padding:14px 0;font-size:14px;font-weight:500;color:#9ca3af;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap;flex:1;text-align:center}
        .tab-btn.active{color:#16a34a;border-bottom-color:#16a34a;font-weight:700}
        .tab-btn:hover{color:#374151}
        .detail-row{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #f3f4f6;align-items:center}
        .detail-row:last-child{border-bottom:none}
        .detail-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
        .similar-card{text-decoration:none;display:block;transition:transform 0.2s}
        .similar-card:hover{transform:translateY(-3px)}
      `}</style>

      {/* HERO */}
      <div style={{position:"relative",height:480,overflow:"hidden"}}>
        <img src={event.cover_image_url||"/images/event-concert.jpg"} alt={event.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
        {/* Mocny gradient od dołu */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.15) 70%, transparent 100%)"}} />

        {/* TOP BAR */}
        <div style={{position:"absolute",top:0,left:0,right:0,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Link href="/" style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(10px)",color:"white",padding:"9px 16px",borderRadius:24,fontSize:13,fontWeight:600,textDecoration:"none",border:"1px solid rgba(255,255,255,0.2)"}}>
            ← Wróć do wydarzeń
          </Link>
          <div style={{display:"flex",gap:8}}>
            {dateBadge && <span style={{background:"#16a34a",color:"white",fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:20}}>{dateBadge}</span>}
            {event.start_date && <span style={{background:"rgba(0,0,0,0.4)",backdropFilter:"blur(10px)",color:"white",fontSize:12,fontWeight:500,padding:"6px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.2)"}}>🕐 {fmtTime(event.start_date)}</span>}
          </div>
          <button onClick={handleShare} style={{width:40,height:40,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:"white"}}>🔗</button>
        </div>

        {/* BOTTOM INFO */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"24px"}}>
          {event.category && (
            <span style={{display:"inline-block",background:"#16a34a",color:"white",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,marginBottom:10,letterSpacing:0.5}}>
              {CATEGORY_LABELS[event.category]||event.category}
            </span>
          )}
          <h1 style={{color:"white",fontSize:32,fontWeight:800,margin:"0 0 8px",lineHeight:1.2,textShadow:"0 2px 12px rgba(0,0,0,0.5)",maxWidth:700}}>
            {event.title}
          </h1>
          {event.short_description && (
            <p style={{color:"rgba(255,255,255,0.85)",fontSize:14,margin:"0 0 12px",lineHeight:1.5,maxWidth:600,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
              {event.short_description}
            </p>
          )}
          <div style={{display:"flex",alignItems:"center",gap:6,color:"rgba(255,255,255,0.8)",fontSize:13,marginBottom:16}}>
            📍 {[event.venue_name,event.address,event.city].filter(Boolean).join(", ")}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex"}}>
                {["#f59e0b","#16a34a","#2563eb","#dc2626"].map((c,i) => (
                  <div key={i} style={{width:30,height:30,borderRadius:"50%",background:c,border:"2px solid white",marginLeft:i===0?0:-10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:700}}>
                    {String.fromCharCode(65+i)}
                  </div>
                ))}
              </div>
              <span style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:500}}>{interestedCount} zainteresowanych</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleGoing} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 28px",background:going?"white":"#16a34a",color:going?"#16a34a":"white",border:"none",borderRadius:24,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
                👥 {going?"Idę ✓":"Idę"}
              </button>
              <button onClick={handleShare} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 20px",background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",color:"white",border:"1px solid rgba(255,255,255,0.3)",borderRadius:24,fontSize:15,fontWeight:600,cursor:"pointer"}}>
                🔗 Udostępnij
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px 60px"}}>
        <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:28,alignItems:"start"}}>

          {/* LEWA: Szczegóły */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"white",borderRadius:20,border:"1px solid #e5e7eb",padding:24,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{fontSize:16,fontWeight:700,color:"#111827",margin:"0 0 4px"}}>Szczegóły wydarzenia</h3>

              <div className="detail-row">
                <div className="detail-icon" style={{background:"#eff6ff"}}>📅</div>
                <div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:2}}>Data</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{fmt(event.start_date)}</div>
                  {event.end_date && event.end_date!==event.start_date && <div style={{fontSize:13,color:"#6b7280"}}>do {fmt(event.end_date)}</div>}
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon" style={{background:"#f0fdf4"}}>🕐</div>
                <div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:2}}>Godzina</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{fmtTime(event.start_date)}{event.end_date&&` – ${fmtTime(event.end_date)}`}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon" style={{background:"#fff7ed"}}>📍</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:2}}>Lokalizacja</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.address||event.city}</div>
                  {event.city&&event.address&&<div style={{fontSize:13,color:"#6b7280"}}>{event.city}</div>}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#16a34a",fontWeight:600,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,marginTop:4}}>
                    Pokaż na mapie →
                  </a>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon" style={{background:"#f0fdf4"}}>🏷️</div>
                <div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:4}}>Kategoria</div>
                  <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:12,fontWeight:700,padding:"3px 12px",borderRadius:20,border:"1px solid #bbf7d0"}}>
                    {CATEGORY_LABELS[event.category]||event.category}
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-icon" style={{background:"#fef9f0"}}>🎟️</div>
                <div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:2}}>Wstęp</div>
                  <div style={{fontSize:14,fontWeight:700,color:event.is_free?"#16a34a":"#111827"}}>
                    {event.is_free?"Wolny":`Od ${event.price_from} PLN`}
                  </div>
                </div>
              </div>

              {event.organizer_name && (
                <div className="detail-row">
                  <div className="detail-icon" style={{background:"#f5f3ff"}}>🏛️</div>
                  <div>
                    <div style={{fontSize:12,color:"#9ca3af",marginBottom:2}}>Organizator</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.organizer_name}</div>
                  </div>
                </div>
              )}
            </div>

            <button style={{width:"100%",padding:13,background:"white",border:"1px solid #e5e7eb",borderRadius:14,fontSize:14,color:"#374151",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
              📅 Dodaj do kalendarza
            </button>

            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{display:"block",padding:13,background:"#16a34a",borderRadius:14,fontSize:14,color:"white",fontWeight:700,textAlign:"center",textDecoration:"none",boxShadow:"0 4px 12px rgba(22,163,74,0.3)"}}>
                🎟️ Kup bilety
              </a>
            )}
          </div>

          {/* PRAWA: Zakładki */}
          <div style={{background:"white",borderRadius:20,border:"1px solid #e5e7eb",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            {/* Tabs */}
            <div style={{display:"flex",borderBottom:"1px solid #e5e7eb"}}>
              {[{id:"details",label:"Opis wydarzenia"},{id:"schedule",label:"Program"},{id:"location",label:"Lokalizacja"}].map(tab => (
                <button key={tab.id} className={`tab-btn ${activeTab===tab.id?"active":""}`} onClick={()=>setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Zawartość */}
            <div style={{padding:24}}>
              {activeTab==="details" && (
                <div>
                  {event.description ? (
                    <p style={{fontSize:15,color:"#374151",lineHeight:1.8,margin:"0 0 20px"}}>{event.description}</p>
                  ) : event.short_description ? (
                    <p style={{fontSize:15,color:"#374151",lineHeight:1.8,margin:"0 0 20px"}}>{event.short_description}</p>
                  ) : (
                    <p style={{fontSize:14,color:"#9ca3af"}}>Brak opisu.</p>
                  )}
                  {event.is_free && (
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:14,padding:"16px 20px"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#16a34a",marginBottom:10}}>Przydatne informacje</div>
                      <div style={{fontSize:14,color:"#374151",display:"flex",alignItems:"center",gap:8,marginBottom:6}}>✅ Wstęp wolny</div>
                      {event.venue_name && <div style={{fontSize:14,color:"#374151",display:"flex",alignItems:"center",gap:8}}>📍 {event.venue_name}</div>}
                    </div>
                  )}
                </div>
              )}
              {activeTab==="schedule" && (
                event.schedule&&event.schedule.length>0
                  ? <EventSchedule schedule={event.schedule} eventDate={event.start_date} />
                  : <div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af",fontSize:14}}>Brak programu dla tego wydarzenia</div>
              )}
              {activeTab==="location" && (
                <div style={{borderRadius:14,overflow:"hidden",border:"1px solid #e5e7eb"}}>
                  <EventMap city={event.city} location={event.address} latitude={event.latitude} longitude={event.longitude} />
                  <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f9fafb"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.address||event.city}</div>
                      {event.city&&event.address&&<div style={{fontSize:13,color:"#6b7280"}}>{event.city}</div>}
                    </div>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#16a34a",fontWeight:700,textDecoration:"none"}}>Nawiguj →</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PODOBNE WYDARZENIA */}
        {similarEvents.length>0 && (
          <div style={{marginTop:48}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:0}}>Podobne wydarzenia</h2>
              <Link href="/" style={{fontSize:14,color:"#16a34a",fontWeight:700,textDecoration:"none"}}>Zobacz wszystkie →</Link>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {similarEvents.map(ev => {
                const s=fmtShort(ev.start_date)
                return (
                  <Link key={ev.id} href={`/events/${ev.slug}`} className="similar-card">
                    <div style={{background:"white",borderRadius:16,border:"1px solid #e5e7eb",overflow:"hidden",boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
                      <div style={{position:"relative",height:130,overflow:"hidden"}}>
                        <img src={ev.cover_image_url||"/images/event-concert.jpg"} alt={ev.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)"}} />
                        <div style={{position:"absolute",bottom:10,left:10,background:"white",borderRadius:10,padding:"5px 10px",textAlign:"center",minWidth:44}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1}}>{s.day}</div>
                          <div style={{fontSize:9,fontWeight:700,color:"#16a34a",textTransform:"uppercase"}}>{s.month}</div>
                        </div>
                        <div style={{position:"absolute",top:10,left:10,background:"#16a34a",color:"white",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10}}>
                          {CATEGORY_LABELS[ev.category]||ev.category}
                        </div>
                      </div>
                      <div style={{padding:"12px 14px"}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:5,lineHeight:1.3}}>{ev.title}</div>
                        <div style={{fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:4}}>📍 {ev.city}</div>
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
    </main>
  )
}
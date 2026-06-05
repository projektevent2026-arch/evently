"use client"

import { Calendar, Clock, MapPin, Tag, Ticket, Building2, Navigation } from "lucide-react"
import EventSchedule from '@/components/EventSchedule'
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import dynamic from "next/dynamic"

const EventMap = dynamic(() => import("@/components/event-map").then(m => m.EventMap), { ssr: false })

const CATEGORY_LABELS: Record<string,string> = {
  culture:"Kultura", music:"Muzyka", food:"Jedzenie",
  sport:"Sport", family:"Rodzinne", technology:"Technologia", festiwal:"Festiwal"
}

export default function EventPageClient({ slug }: { slug: string }) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [going, setGoing] = useState(false)
  const [interestedCount, setInterestedCount] = useState(0)
  const [activeTab, setActiveTab] = useState("details")
  const [similarEvents, setSimilarEvents] = useState<any[]>([])
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    async function fetchEvent() {
        const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
        const { data, error } = await supabase.from("events").select("*")
          .eq(isUUID ? "id" : "slug", slug).single()
      if (!error) {
        setEvent(data)
        const { count } = await supabase
          .from("event_attendees")
          .select("*", { count: "exact", head: true })
          .eq("event_id", data.id)
        setInterestedCount(count || 0)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: existing } = await supabase
            .from("event_attendees")
            .select("user_id")
            .eq("user_id", session.user.id)
            .eq("event_id", data.id)
            .maybeSingle()
          setGoing(!!existing)
        }
        const { data: similar } = await supabase.from("events").select("*").eq("status","published").neq("id",slug).limit(4)
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
      const { error } = await supabase.from("event_attendees").delete().eq("user_id", session.user.id).eq("event_id", event.id)
      if (!error) { setGoing(false); setInterestedCount((p: number) => p - 1) }
    } else {
      const { error } = await supabase.from("event_attendees").insert({ user_id: session.user.id, event_id: event.id })
      if (!error) { setGoing(true); setInterestedCount((p: number) => p + 1) }
    }
  }

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: event?.title, url: window.location.href })
    else navigator.clipboard.writeText(window.location.href)
  }

  const fmt = (d:string) => d ? new Date(d).toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""
  const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"}) : ""
  const fmtTime = (d:string) => d ? new Date(d).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}) : ""
  const fmtShort = (d:string) => { if(!d) return {day:"",month:""}; const dt=new Date(d); return {day:dt.getDate(), month:dt.toLocaleDateString("pl-PL",{month:"short"}).toUpperCase()} }
  const isToday = (d:string) => d ? new Date(d).toDateString()===new Date().toDateString() : false
  const isTomorrow = (d:string) => { if(!d) return false; const t=new Date(); t.setDate(t.getDate()+1); return new Date(d).toDateString()===t.toDateString() }

  if (loading) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280",fontSize:14}}>Ladowanie...</p></div>
  if (!event) return <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center"}}><p style={{color:"#6b7280"}}>Nie znaleziono wydarzenia.</p></div>

  const dateBadge = isToday(event.start_date) ? "DZIS" : isTomorrow(event.start_date) ? "JUTRO" : null
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.address,event.city].filter(Boolean).join(", "))}`
  const hasTabs = event.schedule && event.schedule.length > 0

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
        .info-bar { display:flex; align-items:center; gap:0; background:white; border-bottom:1px solid #e5e7eb; overflow-x:auto; }
        .info-bar-item { display:flex; align-items:center; gap:10px; padding:16px 24px; border-right:1px solid #f3f4f6; flex-shrink:0; }
        .info-bar-item:last-child { border-right:none; margin-left:auto; }
        .event-layout { display:grid; grid-template-columns:1fr 360px; gap:28px; align-items:start; }
        .similar-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        @media (max-width: 900px) {
          .event-layout { grid-template-columns:1fr; }
          .info-bar-item { padding:12px 16px; }
          .similar-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width: 600px) {
          .similar-grid { grid-template-columns:1fr 1fr; }
          .info-bar { flex-wrap:wrap; }
          .info-bar-item { border-right:none; border-bottom:1px solid #f3f4f6; width:50%; }
        }
      `}</style>

      {/* HERO */}
      <div style={{position:"relative", height:"min(500px, 45vw)", minHeight:300, overflow:"hidden"}}>
        <img src={event.cover_image_url||"/images/event-concert.jpg"} alt={event.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.05) 100%)"}} />

        <div style={{position:"absolute",top:0,left:0,right:0,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",padding:"8px 16px",borderRadius:24,fontSize:13,fontWeight:600,textDecoration:"none",border:"1px solid rgba(255,255,255,0.15)"}}>
            Wróc
          </Link>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {dateBadge && <span style={{background:"#16a34a",color:"white",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20,letterSpacing:0.3}}>{dateBadge}</span>}
            {event.start_date && <span style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",fontSize:12,padding:"5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)"}}>{fmtTime(event.start_date)}</span>}
          </div>
        </div>

        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"24px"}}>
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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            {interestedCount > 0 && (
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
            )}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={handleGoing} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"11px 26px",background:going?"white":"#16a34a",color:going?"#16a34a":"white",border:"2px solid "+(going?"white":"#16a34a"),borderRadius:26,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",transition:"all 0.15s"}}>
                {going ? "Ide ✓" : "Ide"}
              </button>
              <button onClick={handleShare} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"11px 18px",background:"transparent",backdropFilter:"blur(12px)",color:"white",border:"2px solid rgba(255,255,255,0.45)",borderRadius:26,fontSize:15,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                Udostepnij
              </button>
              {(event.image_url || event.cover_image_url) && (
                <button onClick={() => setShowPoster(true)} style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",color:"white",padding:"11px 16px",borderRadius:26,fontSize:14,fontWeight:600,border:"1px solid rgba(255,255,255,0.15)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                  Plakat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PASEK INFO */}
      <div className="info-bar">
        <div className="info-bar-item">
          <div style={{width:36,height:36,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Calendar size={16} color="#3b82f6" />
          </div>
          <div>
            <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,textTransform:"uppercase",letterSpacing:0.5}}>Data</div>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{fmtDate(event.start_date)}</div>
          </div>
        </div>
        <div className="info-bar-item">
          <div style={{width:36,height:36,borderRadius:10,background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Clock size={16} color="#16a34a" />
          </div>
          <div>
            <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,textTransform:"uppercase",letterSpacing:0.5}}>Godzina</div>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{fmtTime(event.start_date)}{event.end_date ? ` - ${fmtTime(event.end_date)}` : ""}</div>
          </div>
        </div>
        <div className="info-bar-item">
          <div style={{width:36,height:36,borderRadius:10,background:"#fff7ed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <MapPin size={16} color="#f97316" />
          </div>
          <div>
            <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,textTransform:"uppercase",letterSpacing:0.5}}>Lokalizacja</div>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{event.venue_name||event.address||event.city}</div>
            {event.city && event.address && <div style={{fontSize:12,color:"#6b7280"}}>{event.city}</div>}
          </div>
        </div>
        <div className="info-bar-item">
          <div style={{width:36,height:36,borderRadius:10,background:"#fef9f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ticket size={16} color="#f59e0b" />
          </div>
          <div>
            <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,textTransform:"uppercase",letterSpacing:0.5}}>Wstep</div>
            <div style={{fontSize:14,fontWeight:700,color:event.is_free?"#16a34a":"#111827"}}>
              {event.is_free || !event.price_from || event.price_from === 0 ? "Wolny" : `Od ${event.price_from} PLN`}
            </div>
          </div>
        </div>
        <div className="info-bar-item" style={{marginLeft:"auto"}}>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#16a34a",color:"white",borderRadius:12,fontSize:13,fontWeight:700,textDecoration:"none"}}>
            <Navigation size={14} /> Nawiguj
          </a>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"28px 20px 64px"}}>
        <div className="event-layout">
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"white",borderRadius:18,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",overflow:"hidden"}}>
              {hasTabs && (
                <div style={{display:"flex",borderBottom:"1px solid #f3f4f6"}}>
                  {[
                    {id:"details",label:"Opis wydarzenia"},
                    {id:"schedule",label:"Program"}
                  ].map(tab => (
                    <button key={tab.id} className={`tab-btn ${activeTab===tab.id?"active":""}`} onClick={()=>setActiveTab(tab.id)}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={{padding:"28px"}}>
                {(activeTab==="details" || !hasTabs) && (
                  <div>
                    <p style={{fontSize:15,color:"#374151",lineHeight:1.85,margin:0}}>
                      {event.description||event.short_description||<span style={{color:"#9ca3af"}}>Brak opisu.</span>}
                    </p>
                    {(event.is_free || !event.price_from) && (
                      <div style={{marginTop:24}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#16a34a",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                          Przydatne informacje
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#374151"}}>
                            <span style={{color:"#16a34a"}}>✓</span> Wstep wolny
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
                {activeTab==="schedule" && hasTabs && (
                  <EventSchedule schedule={event.schedule} eventDate={event.start_date} />
                )}
              </div>
            </div>

            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {event.ticket_url && !event.is_free && (
                <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",background:"#16a34a",borderRadius:14,fontSize:14,color:"white",fontWeight:700,textDecoration:"none",boxShadow:"0 4px 14px rgba(22,163,74,0.35)",minWidth:160}}>
                  Kup bilety
                </a>
              )}
              <button style={{flex:1,padding:"13px 16px",background:"white",border:"none",borderRadius:14,fontSize:14,color:"#374151",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.07)",minWidth:160}}>
                Dodaj do kalendarza
              </button>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"white",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
              <div style={{height:220,overflow:"hidden"}}>
                <EventMap city={event.city} location={event.address} latitude={event.latitude} longitude={event.longitude} />
              </div>
              <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{event.venue_name||event.address||event.city}</div>
                  {event.city && event.address && <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{event.city}</div>}
                </div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#16a34a",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                  <Navigation size={13} /> Jak dojechac
                </a>
              </div>
            </div>

            {event.organizer_name && (
              <div style={{background:"white",borderRadius:18,padding:"20px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:0.5,marginBottom:14}}>Organizator</div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:12,background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Building2 size={22} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>{event.organizer_name}</div>
                    {event.website_url && (
                      <a href={event.website_url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#16a34a",textDecoration:"none"}}>
                        {event.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{background:"white",borderRadius:18,padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:0.5,marginBottom:14}}>Szczegoly</div>
              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#eff6ff"}}><Calendar size={16} color="#3b82f6" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>Data</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{fmt(event.start_date)}</div>
                  {event.end_date && event.end_date!==event.start_date && <div style={{fontSize:13,color:"#6b7280",marginTop:1}}>do {fmt(event.end_date)}</div>}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon-wrap" style={{background:"#f0fdf4"}}><Tag size={16} color="#16a34a" /></div>
                <div>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Kategoria</div>
                  <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,border:"1px solid #bbf7d0"}}>
                    {CATEGORY_LABELS[event.category]||event.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {similarEvents.length > 0 && (
          <div style={{marginTop:52}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:0}}>Podobne wydarzenia</h2>
              <Link href="/" style={{fontSize:14,color:"#16a34a",fontWeight:700,textDecoration:"none"}}>Zobacz wszystkie</Link>
            </div>
            <div className="similar-grid">
              {similarEvents.map(ev => {
                const s = fmtShort(ev.start_date)
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`} className="similar-card">
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
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showPoster && (event.image_url || event.cover_image_url) && (
        <div onClick={() => setShowPoster(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,cursor:"pointer"}}>
          <img src={event.image_url || event.cover_image_url} alt="Plakat" style={{maxHeight:"90vh",maxWidth:"90vw",objectFit:"contain",borderRadius:12}} onClick={e => e.stopPropagation()} />
          <button onClick={() => setShowPoster(false)} style={{position:"absolute",top:20,right:20,background:"#333",border:"none",color:"white",width:40,height:40,borderRadius:"50%",fontSize:20,cursor:"pointer"}}>x</button>
        </div>
      )}
    </main>
  )
}
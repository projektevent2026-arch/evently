"use client"

// Współdzielony dropdown "Dodaj do kalendarza" (Google Calendar / Outlook /
// .ics) — używany przez EventPageClient.tsx (variant="light") i
// MobileEventDetail.tsx (variant="dark"). Jeden komponent zamiast dwóch
// kopii tej samej logiki dropdownu/outside-click — patrz historia
// PosterModal (2026-08-21), który był zduplikowany w 3 miejscach i przez to
// bug musiał być naprawiany osobno w każdym.
//
// Dropdown otwiera się W DÓŁ (top-full). Dwie poprzednie próby naprawy
// "ucinania" na mobile (scrollIntoView center, potem scroll z hardcoded
// 112px rezerwy) nie działały z dwóch powodów naraz:
//   1. BottomNav.tsx ma z-50 (fixed), a dropdown miał z-20 — pasek
//      nawigacji renderował się NAD dropdownem niezależnie od scrolla,
//      bo to fixed vs fixed w tej samej strefie ekranu.
//   2. Rezerwa 112px była zgadywanką. Realna wysokość paska to h-14 (56px)
//      + env(safe-area-inset-bottom), które różni się między telefonami
//      (gesty vs przyciski systemowe — widać to na screenach: osobny biały
//      pasek OS pod ciemnym paskiem apki).
// Naprawa: (a) dropdown ma teraz z-[60], wyżej niż BottomNav (z-50) — więc
// nawet gdyby się nałożyły, dropdown wygrywa; (b) wysokość rezerwy jest
// MIERZONA z realnego elementu #app-bottom-nav w DOM (BottomNav.tsx), nie
// zgadywana na sztywno.

import { useState, useRef, useEffect } from "react"
import { Calendar } from "lucide-react"
import { downloadIcs, googleCalendarUrl, outlookCalendarUrl } from "@/lib/eventFormat"

function getBottomNavReserve(): number {
  if (typeof document === "undefined") return 0
  const nav = document.getElementById("app-bottom-nav")
  if (!nav) return 0
  const style = window.getComputedStyle(nav)
  // display:none na desktopie (md:hidden) -> brak rezerwy.
  if (style.display === "none") return 0
  return nav.getBoundingClientRect().height
}

export default function AddToCalendarButton({ event, variant = "light" }: { event: any; variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // Doprzewinięcie przy otwarciu — dokładnie tyle, żeby dół dropdownu
  // wylądował nad rzeczywistą wysokością #app-bottom-nav (0 gdy pasek jest
  // ukryty, np. na desktopie). RAF czeka aż DOM odda finalną wysokość
  // dropdownu po tym samym renderze, w którym open zmieniło się na true.
  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    const id = requestAnimationFrame(() => {
      const reserve = getBottomNavReserve()
      const rect = el.getBoundingClientRect()
      const safeBottom = window.innerHeight - reserve
      if (rect.bottom > safeBottom) {
        window.scrollBy({ top: rect.bottom - safeBottom + 12, behavior: "smooth" })
      } else if (rect.top < 0) {
        window.scrollBy({ top: rect.top - 12, behavior: "smooth" })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  const options = [
    {
      label: "Google Calendar",
      action: () => {
        const url = googleCalendarUrl(event)
        if (url) window.open(url, "_blank", "noopener,noreferrer")
      },
    },
    {
      label: "Outlook",
      action: () => {
        const url = outlookCalendarUrl(event)
        if (url) window.open(url, "_blank", "noopener,noreferrer")
      },
    },
    {
      label: "Pobierz plik .ics",
      action: () => downloadIcs(event),
    },
  ]

  if (variant === "dark") {
    return (
      <div ref={ref} className="relative mt-5">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full py-3.5 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2 bg-green-500 text-black"
        >
          📅 Dodaj do kalendarza
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl z-[60]">
            {options.map(opt => (
              <button
                key={opt.label}
                onClick={() => { opt.action(); setOpen(false) }}
                className="w-full text-left px-4 py-3 text-[13px] text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative" style={{ flex: 1, minWidth: 160 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{width:"100%",padding:"13px 16px",background:"white",border:"none",borderRadius:14,fontSize:14,color:"#374151",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}
      >
        <Calendar size={16} />
        Dodaj do kalendarza
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,right:0,background:"white",borderRadius:14,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",overflow:"hidden",zIndex:60,border:"1px solid #e5e7eb"}}>
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => { opt.action(); setOpen(false) }}
              style={{width:"100%",textAlign:"left",padding:"12px 16px",fontSize:13,color:"#374151",fontWeight:600,background:"none",border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"}}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
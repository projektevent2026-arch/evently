"use client"

// Współdzielony dropdown "Dodaj do kalendarza" (Google Calendar / Outlook /
// .ics) — używany przez EventPageClient.tsx (variant="light") i
// MobileEventDetail.tsx (variant="dark"). Jeden komponent zamiast dwóch
// kopii tej samej logiki dropdownu/outside-click — patrz historia
// PosterModal (2026-08-21), który był zduplikowany w 3 miejscach i przez to
// bug musiał być naprawiany osobno w każdym.
//
// Historia nieudanych prób naprawy "ucinania" dropdownu na mobile:
//   1. scrollIntoView({block:"center"}) — nie wiedziało o fixed BottomNav.
//   2. scroll z hardcoded 112px rezerwy — liczba zgadywana.
//   3. BottomNav ma z-50, dropdown miał z-20 — pasek renderował się NAD
//      dropdownem niezależnie od scrolla. Podniesione do z-[60].
//   4. Dodany spacer, bo dropdown (position:absolute) fizycznie nie
//      powiększa scrollowalnej wysokości strony — bez spacera nie ma
//      czego scrollować.
//   5. NADAL nie działało: scroll liczony był na podstawie `ref`
//      (kontener przycisku), a nie samego dropdownu. getBoundingClientRect()
//      elementu z position:absolute wewnątrz NIE wlicza się do wysokości
//      rodzica — więc warunek "czy trzeba scrollować" sprawdzał wysokość
//      samego przycisku (zawsze mieści się w ekranie) i scroll nigdy się
//      nie uruchamiał. Naprawione: mierzony jest menuRef (sam dropdown).

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
  const [spacerHeight, setSpacerHeight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // Dwuetapowo, w dwóch kolejnych klatkach:
  // 1) zmierz wysokość dropdownu (menuRef) i wstaw spacer tej wysokości pod
  //    przyciskiem — to fizycznie wydłuża stronę, żeby było gdzie scrollować;
  // 2) dopiero gdy spacer jest już w DOM (druga klatka), zmierz POŁOŻENIE
  //    samego dropdownu (menuRef, NIE ref) i policz scroll względem niego —
  //    to jest dokładnie ta wartość, która wcześniej była liczona źle.
  useEffect(() => {
    if (!open || variant !== "dark") {
      setSpacerHeight(0)
      return
    }
    let innerId = 0
    const outerId = requestAnimationFrame(() => {
      const menuH = menuRef.current?.getBoundingClientRect().height ?? 0
      setSpacerHeight(menuH)
      innerId = requestAnimationFrame(() => {
        if (!menuRef.current) return
        const reserve = getBottomNavReserve()
        const rect = menuRef.current.getBoundingClientRect()
        const safeBottom = window.innerHeight - reserve
        if (rect.bottom > safeBottom) {
          window.scrollBy({ top: rect.bottom - safeBottom + 12, behavior: "smooth" })
        } else if (rect.top < 0) {
          window.scrollBy({ top: rect.top - 12, behavior: "smooth" })
        }
      })
    })
    return () => {
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [open, variant])

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
      <>
        <div ref={ref} className="relative mt-5">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full py-3.5 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2 bg-green-500 text-black"
          >
            📅 Dodaj do kalendarza
          </button>
          {open && (
            <div ref={menuRef} className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl z-[60]">
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
        {/* Niewidoczny spacer — patrz komentarz w nagłówku pliku. */}
        <div style={{ height: spacerHeight }} aria-hidden="true" />
      </>
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
"use client"

// Współdzielony dropdown "Dodaj do kalendarza" (Google Calendar / Outlook /
// .ics) — używany przez EventPageClient.tsx (variant="light") i
// MobileEventDetail.tsx (variant="dark"). Jeden komponent zamiast dwóch
// kopii tej samej logiki — patrz historia PosterModal (2026-08-21),
// zduplikowanego w 3 miejscach.
//
// 2026-09-06: PO PIĘCIU nieudanych próbach naprawy "ucinania" dropdownu na
// mobile przez liczenie scrolla (centrowanie, hardcoded rezerwa, z-index,
// spacer, zła referencja przy pomiarze) — zmiana podejścia zamiast kolejnej
// łatki. Powód wszystkich pięciu porażek naraz: mobilne przeglądarki
// dynamicznie zmieniają window.innerHeight przy scrollowaniu (chowanie
// paska adresu), więc JAKAKOLWIEK matematyka scrolla oparta o
// window.innerHeight jest z natury krucha i psuje się przy kolejnym
// scenariuszu (dalszy ręczny scroll, inny telefon, inna przeglądarka).
//
// Nowe podejście na mobile (variant="dark"): dropdown NIE jest już
// doczepiony pod przyciskiem w normalnym flow strony. Jest panelem
// position:fixed, przyklejonym na sztywno do dołu WIDOCZNEGO EKRANU (nad
// paskiem nawigacji), z przyciemnionym tłem zamykającym po kliknięciu —
// standardowy wzorzec "bottom sheet" (jak menu udostępniania w większości
// appek). Nie wymaga ŻADNEGO scrolla ani liczenia pozycji względem
// przycisku — więc cała klasa tego buga znika, a nie tylko kolejny jej
// przypadek. Na desktopie (variant="light") zostaje zwykły dropdown pod
// przyciskiem — tam nie ma stałego paska nawigacji, więc problem nie
// występuje.

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
  const [navReserve, setNavReserve] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Tylko dla variant="light" — na dark zamykanie obsługuje kliknięcie
  // w przyciemnione tło (patrz JSX niżej), bo panel jest position:fixed
  // i wizualnie zasłania resztę ekranu.
  useEffect(() => {
    if (!open || variant !== "light") return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open, variant])

  useEffect(() => {
    if (open && variant === "dark") setNavReserve(getBottomNavReserve())
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
      <div className="relative flex-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full py-3.5 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2 bg-green-500 text-black"
        >
          📅 Dodaj do kalendarza
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[70]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed left-0 right-0 z-[71] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl overflow-hidden shadow-xl"
              style={{ bottom: navReserve }}
            >
              {options.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { opt.action(); setOpen(false) }}
                  className="w-full text-left px-4 py-4 text-[14px] text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
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
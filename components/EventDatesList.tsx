// components/EventDatesList.tsx
//
// Pełna lista terminów eventu — miniony wyszarzony z ✓, najbliższy
// nadchodzący podświetlony, reszta neutralna. Pokazywana tylko gdy
// event ma więcej niż 1 termin (jednodniowe eventy mają to pokryte
// istniejącym paskiem Data/Godzina, dodatkowa lista byłaby szumem).
//
// Compact-row design (2026-08-25 redesign wg mockupu): dzień/miesiąc
// w małym boxie po lewej, badge DZIŚ/JUTRO zastępuje opisowy tekst
// (nie dublujemy informacji). Domyślnie rozwinięta sekcja (Terminy to
// kluczowa informacja), ale pokazuje max 5 wierszy na start — reszta
// za "+X kolejne terminy", żeby event cykliczny z 8+ terminami nie
// zajmował pół ekranu.
//
// Współdzielona między MobileEventDetail i EventPageClient, żeby nie
// powielać tego samego JSX w dwóch miejscach (por. PosterModal x3).

"use client"


import { useState } from "react"
import type { EventDateRow } from "@/lib/getEventWithDates"

const BUILD_PROBE_2026_08_25 = true
const MONTHS_PL_SHORT = ["STY","LUT","MAR","KWI","MAJ","CZE","LIP","SIE","WRZ","PAŹ","LIS","GRU"]
const INITIAL_VISIBLE = 5

function todayStr(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

export default function EventDatesList({
  dates,
  variant = "light",
}: {
  dates: EventDateRow[]
  variant?: "light" | "dark"
}) {
  const [sectionExpanded, setSectionExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (!dates || dates.length <= 1) return null

  const today = todayStr()
  const tomorrow = tomorrowStr()
  // Pierwszy termin z datą >= dziś to najbliższy nadchodzący (dates jest
  // już posortowane przez getEventWithDates).
  const nextIndex = dates.findIndex(d => d.date >= today)

  const isDark = variant === "dark"
  const colors = {
    bg: isDark ? "#18181b" : "#ffffff",
    border: isDark ? "#27272a" : "#e5e7eb",
    text: isDark ? "#e4e4e7" : "#111827",
    muted: isDark ? "#71717a" : "#9ca3af",
    nextBg: isDark ? "rgba(22,163,74,0.15)" : "#f0fdf4",
    dayBoxBg: isDark ? "#27272a" : "#f1f5f9",
  }

  const visibleDates = showAll ? dates : dates.slice(0, INITIAL_VISIBLE)
  const hiddenCount = dates.length - visibleDates.length

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: "red", color: "white", padding: 8, fontWeight: 700 }}>
  PROBE-847291
</div>
      <button
        type="button"
        onClick={() => setSectionExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%",
          background: "none", border: "none", padding: "0 0 10px 0",
          cursor: "pointer",
        }}
        aria-expanded={sectionExpanded}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Terminy ({dates.length})
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={colors.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: sectionExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sectionExpanded && (
        <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden" }}>
          {visibleDates.map((d, i) => {
            const isPast = d.date < today
            const isToday = d.date === today
            const isTomorrow = d.date === tomorrow
            const isNext = i === nextIndex
            const isLastRow = i === visibleDates.length - 1 && hiddenCount === 0
            const dt = new Date(d.date + "T12:00:00")
            const day = dt.getDate()
            const month = MONTHS_PL_SHORT[dt.getMonth()]
            const timeLabel = d.start_time
              ? (d.end_time && d.end_time !== d.start_time ? `${d.start_time.slice(0,5)}–${d.end_time.slice(0,5)}` : d.start_time.slice(0,5))
              : ""

            return (
              <div
                key={d.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px",
                  borderBottom: !isLastRow ? `1px solid ${colors.border}` : "none",
                  background: isNext ? colors.nextBg : "transparent",
                  opacity: isPast ? 0.45 : 1,
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: isNext ? "#16a34a" : colors.dayBoxBg,
                  color: isNext ? "#ffffff" : colors.text,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                  <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: 0.3 }}>{month}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                    {dt.toLocaleDateString("pl-PL", { weekday: "long" })}
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                    {timeLabel || "Godzina nieznana"}
                  </div>
                </div>
                {isToday && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: colors.nextBg, padding: "3px 8px", borderRadius: 999 }}>
                    DZIŚ
                  </span>
                )}
                {isTomorrow && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, background: colors.dayBoxBg, padding: "3px 8px", borderRadius: 999 }}>
                    JUTRO
                  </span>
                )}
                {isPast && <span style={{ fontSize: 13, color: colors.muted }}>✓</span>}
              </div>
            )
          })}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", padding: "10px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: colors.muted,
              }}
            >
              + {hiddenCount} kolejne {hiddenCount === 1 ? "termin" : "terminy"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
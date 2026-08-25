// components/EventDatesList.tsx
//
// Pełna lista terminów eventu — miniony wyszarzony z ✓, najbliższy
// nadchodzący podświetlony, reszta neutralna. Pokazywana tylko gdy
// event ma więcej niż 1 termin (jednodniowe eventy mają to pokryte
// istniejącym paskiem Data/Godzina, dodatkowa lista byłaby szumem).
//
// Collapsible: domyślnie rozwinięta (Terminy to kluczowa informacja,
// nie coś do chowania), ale zwijalna dla eventów z wieloma terminami
// żeby nie zajmowała pół ekranu.
//
// Współdzielona między MobileEventDetail i EventPageClient, żeby nie
// powielać tego samego JSX w dwóch miejscach (por. PosterModal x3).

"use client"

import { useState } from "react"
import type { EventDateRow } from "@/lib/getEventWithDates"

const MONTHS_PL = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"]

function todayStr(): string {
  const d = new Date()
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
  const [expanded, setExpanded] = useState(true)

  if (!dates || dates.length <= 1) return null

  const today = todayStr()
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
    headerHoverBg: isDark ? "#27272a" : "#f4f4f5",
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%",
          background: "none", border: "none", padding: "0 0 10px 0",
          cursor: "pointer",
        }}
        aria-expanded={expanded}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Terminy ({dates.length})
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={colors.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden" }}>
          {dates.map((d, i) => {
            const isPast = d.date < today
            const isNext = i === nextIndex
            const dt = new Date(d.date + "T12:00:00")
            const day = dt.getDate()
            const month = MONTHS_PL[dt.getMonth()].slice(0, 3)
            const timeLabel = d.start_time
              ? (d.end_time && d.end_time !== d.start_time ? `${d.start_time.slice(0,5)}–${d.end_time.slice(0,5)}` : d.start_time.slice(0,5))
              : ""

            return (
              <div
                key={d.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  borderBottom: i < dates.length - 1 ? `1px solid ${colors.border}` : "none",
                  background: isNext ? colors.nextBg : "transparent",
                  opacity: isPast ? 0.45 : 1,
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 9, flexShrink: 0,
                  background: isNext ? "#16a34a" : colors.dayBoxBg,
                  color: isNext ? "#ffffff" : colors.text,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                  <span style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.3 }}>{month}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                    {timeLabel || "Godzina nieznana"}
                  </div>
                  <div style={{ fontSize: 11, color: isNext ? "#16a34a" : colors.muted, fontWeight: isNext ? 600 : 400, marginTop: 1 }}>
                    {isPast ? "Odbyło się" : isNext ? "● Najbliższy termin" : "Nadchodzi"}
                  </div>
                </div>
                {isPast && <span style={{ fontSize: 13, color: colors.muted }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
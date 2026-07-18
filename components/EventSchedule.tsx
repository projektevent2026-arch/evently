'use client'

import { useState, useEffect } from 'react'

interface ScheduleItem {
  time?: string
  title: string
  description?: string
}

interface ScheduleDay {
  day: number
  label: string
  items: ScheduleItem[]
}

interface EventScheduleProps {
  schedule: ScheduleDay[]
  eventDate?: string
}

const ACCENT = '#60a5fa'
const LIVE = '#22c55e'

/** "9:00" | "09.00" | "9" -> "09:00". Zwraca null gdy to nie jest godzina. */
function normalizeTime(raw?: string): string | null {
  if (!raw) return null
  const s = raw.trim().replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[:.]?(\d{2})?$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (h > 23 || min > 59) return null
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

/** Data dnia programu: pierwsze 10 znaków timestamptz + offset dnia. Bez new Date na stringu z bazy. */
function dayISO(eventDate: string | undefined, offset: number): string | null {
  if (!eventDate || eventDate.length < 10) return null
  const base = eventDate.slice(0, 10)
  const m = base.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${(n.getMonth() + 1).toString().padStart(2, '0')}-${n
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

export default function EventSchedule({ schedule, eventDate }: EventScheduleProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [now, setNow] = useState<{ time: string; date: string } | null>(null)

  useEffect(() => {
    const update = () => {
      const d = new Date()
      setNow({
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        date: todayISO(),
      })
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!schedule || schedule.length === 0) return null

  const day = schedule[activeDay]
  if (!day || !day.items || day.items.length === 0) return null

  const valid = day.items.filter((it) => it && it.title && it.title.trim())
  if (valid.length === 0) return null

  // Podział: z godziną / bez godziny
  const timed: { time: string; items: ScheduleItem[] }[] = []
  const untimed: ScheduleItem[] = []

  for (const item of valid) {
    const t = normalizeTime(item.time)
    if (t) {
      const group = timed.find((g) => g.time === t)
      if (group) group.items.push(item)
      else timed.push({ time: t, items: [item] })
    } else {
      untimed.push(item)
    }
  }
  timed.sort((a, b) => a.time.localeCompare(b.time))

  // TERAZ tylko gdy dzisiaj = data tego dnia programu
  const thisDayISO = dayISO(eventDate, activeDay)
  const isToday = !!now && !!thisDayISO && now.date === thisDayISO

  const statusOf = (index: number): 'active' | 'past' | 'upcoming' => {
    if (!isToday || !now) return 'upcoming'
    const cur = timed[index]
    const next = timed[index + 1]
    if (now.time >= cur.time && (!next || now.time < next.time)) return 'active'
    if (now.time > cur.time) return 'past'
    return 'upcoming'
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 24,
  }

  return (
    <div style={card}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>Program imprezy</h3>
      </div>

      {schedule.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            overflowX: 'auto',
          }}
        >
          {schedule.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.10)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: activeDay === i ? ACCENT : 'rgba(255,255,255,0.06)',
                color: activeDay === i ? '#0b1220' : '#d1d5db',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {timed.length > 0 && (
        <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
          {timed.map((group, i) => {
            const status = statusOf(i)
            const isActive = status === 'active'
            const isPast = status === 'past'
            const dotColor = isActive ? LIVE : isPast ? '#4b5563' : ACCENT

            return (
              <div key={group.time} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {i < timed.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 48,
                      top: 22,
                      width: 2,
                      height: '100%',
                      background: 'rgba(255,255,255,0.10)',
                      zIndex: 0,
                    }}
                  />
                )}

                <div
                  style={{
                    width: 42,
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: isActive ? LIVE : isPast ? '#6b7280' : '#e5e7eb',
                    paddingTop: 2,
                    textAlign: 'right',
                  }}
                >
                  {group.time}
                </div>

                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 4,
                    zIndex: 1,
                    background: isActive ? LIVE : isPast ? '#374151' : 'transparent',
                    border: `2px solid ${dotColor}`,
                    boxShadow: isActive ? `0 0 0 4px ${LIVE}33` : 'none',
                  }}
                />

                <div style={{ flex: 1, paddingBottom: 18, opacity: isPast ? 0.45 : 1 }}>
                  {isActive && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: LIVE,
                        color: '#052e16',
                        borderRadius: 4,
                        padding: '2px 6px',
                        marginBottom: 4,
                      }}
                    >
                      TERAZ
                    </span>
                  )}

                  {group.items.map((item, j) => (
                    <div key={j} style={{ marginTop: j === 0 ? 0 : 8 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#ffffff' : '#f3f4f6',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {untimed.length > 0 && (
        <div style={{ padding: timed.length > 0 ? '0.25rem 1.25rem 1.25rem' : '1rem 1.25rem 1.25rem' }}>
          {timed.length > 0 && (
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#9ca3af',
              }}
            >
              W programie również
            </p>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {untimed.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: ACCENT,
                    flexShrink: 0,
                    marginTop: 7,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, color: '#f3f4f6', lineHeight: 1.35 }}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
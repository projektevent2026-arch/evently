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
  variant?: 'light' | 'dark'
}

const THEMES = {
  light: {
    heading: '#0f172a',
    title: '#0f172a',
    desc: '#475569',
    time: '#334155',
    timePast: '#94a3b8',
    line: '#e2e8f0',
    dotBg: '#ffffff',
    dotPast: '#e2e8f0',
    dotBorderPast: '#cbd5e1',
    accent: '#16a34a',
    live: '#16a34a',
    liveText: '#ffffff',
    tabBg: '#ffffff',
    tabBorder: '#d1d5db',
    tabText: '#374151',
    sectionLabel: '#64748b',
  },
  dark: {
    heading: '#f8fafc',
    title: '#f1f5f9',
    desc: '#cbd5e1',
    time: '#e2e8f0',
    timePast: '#64748b',
    line: 'rgba(255,255,255,0.14)',
    dotBg: 'transparent',
    dotPast: '#334155',
    dotBorderPast: '#475569',
    accent: '#22c55e',
    live: '#22c55e',
    liveText: '#052e16',
    tabBg: 'rgba(255,255,255,0.07)',
    tabBorder: 'rgba(255,255,255,0.18)',
    tabText: '#e2e8f0',
    sectionLabel: '#94a3b8',
  },
}

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

export default function EventSchedule({ schedule, eventDate, variant = 'light' }: EventScheduleProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [now, setNow] = useState<{ time: string; date: string } | null>(null)

  const t = THEMES[variant]

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
    const norm = normalizeTime(item.time)
    if (norm) {
      const group = timed.find((g) => g.time === norm)
      if (group) group.items.push(item)
      else timed.push({ time: norm, items: [item] })
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

  return (
    <div style={{ marginTop: 8 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: t.heading }}>
        Program imprezy
      </h3>

      {schedule.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
          {schedule.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: 8,
                border: activeDay === i ? 'none' : `1px solid ${t.tabBorder}`,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: activeDay === i ? t.accent : t.tabBg,
                color: activeDay === i ? '#ffffff' : t.tabText,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {timed.length > 0 && (
        <div>
          {timed.map((group, i) => {
            const status = statusOf(i)
            const isActive = status === 'active'
            const isPast = status === 'past'
            const dotBorder = isActive ? t.live : isPast ? t.dotBorderPast : t.accent

            return (
              <div key={group.time} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                {i < timed.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 51,
                      top: 22,
                      width: 2,
                      height: '100%',
                      background: t.line,
                      zIndex: 0,
                    }}
                  />
                )}

                <div
                  style={{
                    width: 44,
                    flexShrink: 0,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: isActive ? t.live : isPast ? t.timePast : t.time,
                    paddingTop: 1,
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
                    background: isActive ? t.live : isPast ? t.dotPast : t.dotBg,
                    border: `2px solid ${dotBorder}`,
                    boxShadow: isActive ? `0 0 0 4px ${t.live}33` : 'none',
                  }}
                />

                <div style={{ flex: 1, paddingBottom: 20, opacity: isPast ? 0.55 : 1 }}>
                  {isActive && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: t.live,
                        color: t.liveText,
                        borderRadius: 4,
                        padding: '2px 7px',
                        marginBottom: 5,
                      }}
                    >
                      TERAZ
                    </span>
                  )}

                  {group.items.map((item, j) => (
                    <div key={j} style={{ marginTop: j === 0 ? 0 : 10 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          fontWeight: isActive ? 700 : 600,
                          color: t.title,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: t.desc, lineHeight: 1.5 }}>
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
        <div style={{ marginTop: timed.length > 0 ? 4 : 0 }}>
          {timed.length > 0 && (
            <p
              style={{
                margin: '0 0 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: t.sectionLabel,
              }}
            >
              W programie również
            </p>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {untimed.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: t.accent,
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: t.title, lineHeight: 1.4 }}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: t.desc, lineHeight: 1.5 }}>
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
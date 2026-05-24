'use client'

import { useState, useEffect } from 'react'

interface ScheduleItem {
  time: string
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

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2']

export default function EventSchedule({ schedule, eventDate }: EventScheduleProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!schedule || schedule.length === 0) return null

  const day = schedule[activeDay]
  const sorted = [...day.items]
  .filter(item => item.time && item.title)
  .sort((a, b) => a.time.localeCompare(b.time))

  const getStatus = (item: ScheduleItem, index: number) => {
    if (!currentTime) return 'upcoming'
    const next = sorted[index + 1]
    if (currentTime >= item.time && (!next || currentTime < next.time)) return 'active'
    if (currentTime > item.time) return 'past'
    return 'upcoming'
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: 24 }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Program imprezy</h3>
      </div>

      {/* Day tabs */}
      {schedule.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: '0.75rem 1.25rem', borderBottom: '1px solid #f3f4f6', overflowX: 'auto' }}>
          {schedule.map((d, i) => (
            <button key={i} onClick={() => setActiveDay(i)} style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
              background: activeDay === i ? '#1e3a8a' : '#f3f4f6',
              color: activeDay === i ? 'white' : '#6b7280',
            }}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.map((item, i) => {
          const status = getStatus(item, i)
          const color = COLORS[i % COLORS.length]
          const isActive = status === 'active'
          const isPast = status === 'past'

          return (
            <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
              {/* Timeline line */}
              {i < sorted.length - 1 && (
                <div style={{ position: 'absolute', left: 47, top: 20, width: 2, height: '100%', background: '#e5e7eb', zIndex: 0 }} />
              )}

              {/* Time */}
              <div style={{ width: 42, flexShrink: 0, fontSize: '0.85rem', fontWeight: 700, color: isActive ? color : isPast ? '#9ca3af' : '#374151', paddingTop: 2, textAlign: 'right' }}>
                {item.time}
              </div>

              {/* Dot */}
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 4, zIndex: 1,
                background: isActive ? color : isPast ? '#d1d5db' : 'white',
                border: `2px solid ${isActive ? color : isPast ? '#d1d5db' : color}`,
                boxShadow: isActive ? `0 0 0 3px ${color}22` : 'none',
              }} />

              {/* Content */}
              <div style={{
                flex: 1, paddingBottom: 16,
                opacity: isPast ? 0.5 : 1,
              }}>
                <p style={{
                  margin: 0, fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? color : '#111827',
                }}>
                  {isActive && <span style={{ fontSize: '0.75rem', background: color, color: 'white', borderRadius: 4, padding: '1px 6px', marginRight: 6 }}>TERAZ</span>}
                  {item.title}
                </p>
                {item.description && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{item.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

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

interface ScheduleEditorProps {
  value: ScheduleDay[]
  onChange: (days: ScheduleDay[]) => void
}

export default function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const [activeDay, setActiveDay] = useState(0)

  const addDay = () => {
    const newDay: ScheduleDay = {
      day: value.length + 1,
      label: `Dzień ${value.length + 1}`,
      items: []
    }
    onChange([...value, newDay])
    setActiveDay(value.length)
  }

  const removeDay = (dayIndex: number) => {
    const updated = value.filter((_, i) => i !== dayIndex).map((d, i) => ({ ...d, day: i + 1, label: `Dzień ${i + 1}` }))
    onChange(updated)
    setActiveDay(Math.max(0, dayIndex - 1))
  }

  const addItem = (dayIndex: number) => {
    const updated = value.map((d, i) =>
      i === dayIndex ? { ...d, items: [...d.items, { time: '12:00', title: '', description: '' }] } : d
    )
    onChange(updated)
  }

  const updateItem = (dayIndex: number, itemIndex: number, field: keyof ScheduleItem, val: string) => {
    const updated = value.map((d, i) =>
      i === dayIndex ? {
        ...d,
        items: d.items.map((item, j) => j === itemIndex ? { ...item, [field]: val } : item)
      } : d
    )
    onChange(updated)
  }

  const removeItem = (dayIndex: number, itemIndex: number) => {
    const updated = value.map((d, i) =>
      i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) } : d
    )
    onChange(updated)
  }

  if (value.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed #d1d5db', borderRadius: 8 }}>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: 8 }}>Brak harmonogramu</p>
        <button type="button" onClick={addDay} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#16a34a' }}>
          <Plus size={14} /> Dodaj dzień
        </button>
      </div>
    )
  }

  const currentDay = value[activeDay]

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      {/* Day tabs */}
      <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {value.map((d, i) => (
          <button key={i} type="button" onClick={() => setActiveDay(i)} style={{
            padding: '0.6rem 1rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeDay === i ? 600 : 400,
            background: activeDay === i ? 'white' : 'transparent',
            color: activeDay === i ? '#16a34a' : '#6b7280',
            borderBottom: activeDay === i ? '2px solid #16a34a' : '2px solid transparent',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {d.label}
            {value.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); removeDay(i) }} style={{ color: '#ef4444', fontSize: '0.75rem', lineHeight: 1 }}>×</span>
            )}
          </button>
        ))}
        <button type="button" onClick={addDay} style={{ padding: '0.6rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: '0.85rem' }}>
          + dzień
        </button>
      </div>

      {/* Items */}
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {currentDay.items.map((item, j) => (
          <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f9fafb', borderRadius: 8, padding: '6px 8px' }}>
            {/* Time — input zamiast select: przyjmuje każde HH:MM (16:15, 16:45 itd.) */}
            <input
              type="time"
              value={item.time}
              onChange={e => updateItem(activeDay, j, 'time', e.target.value)}
              style={{ padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.85rem', background: 'white', color: '#16a34a', fontWeight: 600, width: 92, flexShrink: 0 }}
            />

            {/* Title + description */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <input
                placeholder="Nazwa punktu programu *"
                value={item.title}
                onChange={e => updateItem(activeDay, j, 'title', e.target.value)}
                style={{ padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', color: '#111827', fontWeight: 500, background: 'white' }}
              />
              <input
                placeholder="Opis (opcjonalnie)"
                value={item.description || ''}
                onChange={e => updateItem(activeDay, j, 'description', e.target.value)}
                style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box', color: '#374151', background: 'white' }}
              />
            </div>

            <button type="button" onClick={() => removeItem(activeDay, j)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button type="button" onClick={() => addItem(activeDay)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.5rem', border: '1px dashed #d1d5db', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: '0.83rem', color: '#6b7280', marginTop: 2 }}>
          <Plus size={13} /> Dodaj punkt programu
        </button>
      </div>
    </div>
  )
}
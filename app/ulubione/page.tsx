'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useFavorites } from '@/hooks/useFavorites'

interface Event {
  id: string
  slug: string | null
  title: string
  start_date: string
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  address: string | null
  city: string | null
  category: string | null
  image_url: string | null
  cover_image_url: string | null
  is_free: boolean
}

const MONTH_PL = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU']

const CAT_COLORS: Record<string, string> = {
  festyny: 'bg-amber-500 text-black',
  kultura: 'bg-purple-500 text-white',
  muzyka:  'bg-green-500 text-black',
  sport:   'bg-blue-500 text-white',
}

const CAT_LABELS: Record<string, string> = {
  festyny: 'Festyny', kultura: 'Kultura', muzyka: 'Muzyka', sport: 'Sport',
}

function normalizeCategory(raw: string | null): string {
  const c = (raw ?? '').toLowerCase().trim()
  if (c === 'kultura' || c === 'culture') return 'kultura'
  if (c === 'muzyka' || c === 'music') return 'muzyka'
  if (c === 'sport') return 'sport'
  return 'festyny'
}

function getDateParts(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  return { day: d.getDate(), month: MONTH_PL[d.getMonth()] }
}

export default function UlubionePage() {
  const { favorites, loaded, toggleFavorite } = useFavorites()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) return

    async function load() {
      if (favorites.length === 0) {
        setEvents([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('id', favorites)
          .order('start_date', { ascending: true })
        if (error) throw error
        setEvents(data ?? [])
      } catch (err) {
        console.error('[Evently] Nie udało się pobrać ulubionych:', err)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [favorites, loaded])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">
      <div className="px-4 pt-6 pb-4">
        <Link href="/" className="text-[13px] text-zinc-500 mb-3 inline-block">← Wróć</Link>
        <h1 className="text-[24px] font-black tracking-tight">
          Moje <span className="text-green-500">ulubione</span>
        </h1>
        <p className="text-[12px] text-zinc-500 mt-1">
          {events.length === 0 ? 'Brak zapisanych wydarzeń' : `${events.length} zapisanych wydarzeń`}
        </p>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 h-24 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤍</div>
            <p className="text-zinc-300 text-sm font-semibold mb-2">Nie masz jeszcze ulubionych</p>
            <p className="text-zinc-600 text-xs mb-6 px-6">
              Kliknij serduszko przy wydarzeniu, żeby zapisać je tutaj.
            </p>
            <Link
              href="/"
              className="inline-block bg-green-500 text-black text-[13px] font-bold px-6 py-2.5 rounded-xl"
            >
              Przeglądaj wydarzenia
            </Link>
          </div>
        ) : (
          events.map(e => {
            const cat = normalizeCategory(e.category)
            const { day, month } = getDateParts(e.start_date)
            const img = e.cover_image_url || e.image_url
            const time = e.start_time?.slice(0, 5)

            return (
              <div key={e.id} className="mb-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${CAT_COLORS[cat]}`}>
                        {CAT_LABELS[cat].toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center px-2.5 py-1 rounded-xl min-w-[42px] bg-zinc-800">
                          <span className="text-[16px] font-black leading-none text-white">{day}</span>
                          <span className="text-[9px] font-bold text-zinc-400 leading-none mt-0.5">{month}</span>
                        </div>
                        <button
                          onClick={() => toggleFavorite(e.id)}
                          className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm"
                          aria-label="Usuń z ulubionych"
                        >
                          ♥
                        </button>
                      </div>
                    </div>

                    <Link href={`/events/${e.slug || e.id}`} className="block">
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-black text-white leading-tight mb-1 line-clamp-2">
                            {e.title}
                          </p>
                          {(e.venue_name || e.address) && (
                            <p className="text-[11px] text-zinc-400 mb-0.5">
                              📍 {e.venue_name || e.address}{e.city ? `, ${e.city}` : ''}
                            </p>
                          )}
                          {time && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              🕐 {time}{e.end_time ? ` – ${e.end_time.slice(0,5)}` : ''}
                            </p>
                          )}
                          {e.is_free && (
                            <span className="inline-block mt-1 text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                              Wstęp wolny
                            </span>
                          )}
                        </div>
                        {img && (
                          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-zinc-700">
                            <img src={img} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import EventSchedule from '@/components/EventSchedule'

const EventMap = dynamic(() => import('@/components/event-map').then(m => m.EventMap), { ssr: false })

const CAT_LABELS: Record<string, string> = {
  culture: 'Kultura', music: 'Muzyka', food: 'Jedzenie',
  sport: 'Sport', family: 'Rodzinne', technology: 'Technologia',
  festiwal: 'Festiwal', kultura: 'Kultura', muzyka: 'Muzyka',
  jedzenie: 'Jedzenie',
}

const CAT_COLOR: Record<string, string> = {
  festiwal: 'bg-green-500 text-black', muzyka: 'bg-green-500 text-black',
  music: 'bg-green-500 text-black', sport: 'bg-blue-500 text-white',
  kultura: 'bg-purple-500 text-white', culture: 'bg-purple-500 text-white',
  family: 'bg-orange-400 text-black', jedzenie: 'bg-orange-500 text-white',
  food: 'bg-orange-500 text-white',
}

const CAT_GRADIENT: Record<string, string> = {
  muzyka: 'from-[#060e18] via-[#0e2040] to-[#2d5cbf]',
  music: 'from-[#060e18] via-[#0e2040] to-[#2d5cbf]',
  festiwal: 'from-[#060e18] via-[#0e2040] to-[#2d5cbf]',
  sport: 'from-[#060f1a] via-[#0a1f35] to-[#1a3a5c]',
  kultura: 'from-[#120820] via-[#1e1040] to-[#3d1a6e]',
  culture: 'from-[#120820] via-[#1e1040] to-[#3d1a6e]',
  family: 'from-[#1a0a00] via-[#2d1800] to-[#4a2800]',
  jedzenie: 'from-[#1a0800] via-[#2a1200] to-[#4a2200]',
  food: 'from-[#1a0800] via-[#2a1200] to-[#4a2200]',
}

const TABS = ['O wydarzeniu', 'Program', 'Lokalizacja']

// Data — bezpieczne wyświetlanie. Bierzemy tylko część YYYY-MM-DD, żeby
// new Date nie przeliczał strefy czasowej i nie zmieniał dnia.
function fmt(d: string) {
  if (!d) return ''
  const dayPart = d.slice(0, 10) // 'YYYY-MM-DD'
  const dt = new Date(dayPart + 'T12:00:00') // południe = odporne na strefę
  return dt.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Godzina — czytamy WPROST ze start_time / end_time ('20:00[:00]'), bez new Date.
// To naprawia bug „20:00 -> 22:00": poprzednio godzina była liczona z pola DATY
// (start_date), które new Date traktował jako północ UTC -> +2h w PL i start==koniec.
function fmtClock(t?: string | null) {
  if (!t) return ''
  return t.slice(0, 5) // 'HH:MM'
}

export default function MobileEventDetail({ slug }: { slug: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [going, setGoing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attendees, setAttendees] = useState(0)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    async function load() {
        const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
        const { data, error } = await supabase.from("events").select("*")
          .eq(isUUID ? "id" : "slug", slug).single()
      if (!error && data) {
        setEvent(data)
        const { count } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', data.id)
        setAttendees(count || 0)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: ex } = await supabase
            .from('event_attendees').select('user_id')
            .eq('user_id', session.user.id).eq('event_id', data.id).maybeSingle()
          setGoing(!!ex)
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleGoing = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    if (going) {
      await supabase.from('event_attendees').delete()
        .eq('user_id', session.user.id).eq('event_id', event.id)
      setGoing(false); setAttendees(p => p - 1)
    } else {
      await supabase.from('event_attendees').insert(
        { user_id: session.user.id, event_id: event.id }
      )
      setGoing(true); setAttendees(p => p + 1)
    }
  }

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: event?.title, url: window.location.href })
    else navigator.clipboard.writeText(window.location.href)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-green-500 text-sm animate-pulse">Ładowanie...</div>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-zinc-500 text-sm">Nie znaleziono wydarzenia.</div>
    </div>
  )

  const cat = (event.category ?? 'inne').toLowerCase()
  const gradient = CAT_GRADIENT[cat] ?? 'from-zinc-900 via-zinc-800 to-zinc-700'
  const tagColor = CAT_COLOR[cat] ?? 'bg-zinc-600 text-white'
  const tagLabel = CAT_LABELS[cat] ?? cat.toUpperCase()
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.address, event.city].filter(Boolean).join(', '))}`
  const hasTabs = event.schedule && event.schedule.length > 0
  const tabs = hasTabs ? TABS : ['O wydarzeniu', 'Lokalizacja']

  // Godzina z właściwych pól. Koniec pokazujemy tylko, gdy istnieje i różni się od startu.
  const startClock = fmtClock(event.start_time)
  const endClock = fmtClock(event.end_time)
  const timeLabel = startClock
    ? (endClock && endClock !== startClock ? `${startClock}–${endClock}` : startClock)
    : ''

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">

      {/* ── HERO ── */}
      <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${gradient}`}>
        {(event.cover_image_url || event.image_url) && (
          <img
            src={event.cover_image_url || event.image_url}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-black/55 border border-white/18 flex items-center justify-center text-white text-sm"
          >
            ←
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSaved(!saved)}
              className="w-8 h-8 rounded-full bg-black/55 border border-white/18 flex items-center justify-center text-base"
            >
              {saved ? '🔖' : '♡'}
            </button>
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-black/55 border border-white/18 flex items-center justify-center text-sm text-white"
            >
              ↗
            </button>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
          <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg mb-2 inline-block ${tagColor}`}>
            {tagLabel}
          </span>
          <h1 className="text-[22px] font-black leading-tight tracking-tight mb-1.5">
            {event.title}
          </h1>
          <p className="text-[11px] text-zinc-300 mb-2.5 whitespace-pre-line">
            📅 {fmt(event.start_date)}{timeLabel ? ` • ${timeLabel}` : ''}
            {event.city ? `\n📍 ${event.venue_name || event.address || event.city}` : ''}
          </p>

          {/* Attendees + Idę */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {['#3b5998', '#e91e63', '#ff9800'].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-black -ml-1.5 first:ml-0" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[11px] text-zinc-300">{attendees} idą</span>
            <button
              onClick={handleGoing}
              className={`ml-auto px-5 py-2 rounded-full text-[12px] font-black transition-colors ${
                going ? 'bg-white text-green-600' : 'bg-green-500 text-black'
              }`}
            >
              {going ? '✓ Idę' : '👥 Idę'}
            </button>
          </div>
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
        {[
          { icon: '📅', label: 'Data', value: fmt(event.start_date) || '—' },
          { icon: '⏰', label: 'Godzina', value: timeLabel || '—' },
          { icon: '📍', label: 'Lokalizacja', value: event.city || event.address || '—' },
          { icon: '🎟️', label: 'Wstęp', value: event.is_free ? 'Wolny' : event.price_from ? `Od ${event.price_from} PLN` : '—', green: event.is_free },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-r border-zinc-800 flex-shrink-0 last:border-r-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-[11px] flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-wide">{item.label}</div>
              <div className={`text-[11px] font-bold ${item.green ? 'text-green-400' : 'text-white'}`}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-[#111] border-b border-zinc-800">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2.5 text-[10px] font-semibold border-b-2 transition-colors ${
              activeTab === i
                ? 'text-green-400 border-green-500'
                : 'text-zinc-500 border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 py-4">

        {/* Tab 0: O wydarzeniu */}
        {activeTab === 0 && (
          <div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mb-4 whitespace-pre-line">
              {event.description || event.short_description || 'Brak opisu.'}
            </p>

            {/* Schedule preview */}
            {hasTabs && event.schedule?.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[11px] font-bold text-green-400 min-w-[38px]">
                  {item.time}
                </span>
                <span className="text-[11px] text-zinc-300">{item.title || item.name}</span>
              </div>
            ))}
            {hasTabs && event.schedule?.length > 4 && (
              <button
                onClick={() => setActiveTab(1)}
                className="text-[11px] text-green-400 font-semibold mt-1"
              >
                Zobacz cały program ›
              </button>
            )}

            {/* Organizer */}
            {event.organizer_name && (
              <div className="mt-5 flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-xl flex-shrink-0">
                  🏛️
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-white">{event.organizer_name}</div>
                  {event.website_url && (
                    <a
                      href={event.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-500"
                    >
                      {event.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                <span className="text-[10px] font-bold text-green-400 border border-green-500/30 bg-green-500/10 px-2.5 py-1 rounded-lg">
                  Obserwuj
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Program (jeśli jest) */}
        {activeTab === 1 && hasTabs && (
          <EventSchedule schedule={event.schedule} eventDate={event.start_date} />
        )}

        {/* Tab: Lokalizacja */}
        {((activeTab === 1 && !hasTabs) || (activeTab === 2 && hasTabs)) && (
          <div>
            <div className="rounded-xl overflow-hidden border border-zinc-800 h-48 mb-3">
              <EventMap
                city={event.city}
                location={event.address}
                latitude={event.latitude}
                longitude={event.longitude}
              />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold text-white">
                  {event.venue_name || event.address || event.city}
                </div>
                {event.city && event.address && (
                  <div className="text-[11px] text-zinc-500 mt-0.5">{event.city}</div>
                )}
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-black bg-green-500 px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                Nawiguj
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 px-4 py-3 flex gap-2 z-50 md:hidden">
        <button
          onClick={handleGoing}
          className={`flex-1 py-3 rounded-2xl text-[13px] font-black flex items-center justify-center gap-1.5 transition-colors ${
            going ? 'bg-green-600 text-white' : 'bg-green-500 text-black'
          }`}
        >
          👥 {going ? 'Idę ✓' : 'Idę'}
        </button>
        <button
          onClick={() => setSaved(!saved)}
          className="bg-zinc-900 border border-zinc-700 text-white py-3 px-4 rounded-2xl text-[13px] font-semibold flex items-center gap-1.5"
        >
          🔖 Zapisz
        </button>
        <button
          onClick={handleShare}
          className="bg-zinc-900 border border-zinc-700 text-white py-3 px-4 rounded-2xl text-[13px] font-semibold flex items-center gap-1.5"
        >
          ↗ Udostępnij
        </button>
      </div>

    </div>
  )
}
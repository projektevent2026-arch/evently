'use client'

import PosterButton from '@/components/PosterButton'
import EventHero from '@/components/EventHero'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import EventSchedule from '@/components/EventSchedule'
import { useFavorites } from '@/hooks/useFavorites'
import { getEventWithDates } from '@/lib/getEventWithDates'
import EventDatesList from '@/components/EventDatesList'
import { dateRange, isMultiDay, weekdayName, fmtClock, durationLabel, nextTermInfo, linkify, downloadIcs } from '@/lib/eventFormat'

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

export default function MobileEventDetail({ slug }: { slug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  // Ulubione na localStorage — bez kont. Zsynchronizowane z kartami i stroną /ulubione.
  const { isFavorite, toggleFavorite } = useFavorites()

  useEffect(() => {
    async function load() {
      const data = await getEventWithDates(slug, isPreview)
      if (data) {
        setEvent(data)
        // Pobieranie RSVP (kto idzie) usunięte — RSVP wraca w tier D razem z kontami.
      }
      setLoading(false)
    }
    load()
  }, [slug, isPreview])

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

  // Godzina ze start_date/end_date (tam jest zapisana). Koniec tylko gdy istnieje i różni się od startu.
  const startClock = fmtClock(event.start_date)
  const endClock = fmtClock(event.end_date)
  const timeLabel = startClock
    ? (endClock && endClock !== startClock ? `${startClock}–${endClock}` : startClock)
    : ''

  const nextTerm = nextTermInfo(event.event_dates)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">

      {isPreview && event.status !== 'published' && (
        <div className="bg-amber-500 text-black text-[11px] font-bold text-center py-1.5">
          🔍 Podgląd administratora — status: {event.status}, jeszcze niepubliczne
        </div>
      )}

      {/* ── HERO ── */}
      <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${gradient}`}>
      <EventHero src={event.cover_image_url || event.image_url} alt={event.title} />
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
              onClick={() => toggleFavorite(event.id)}
              aria-label={isFavorite(event.id) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-base transition-colors ${
                isFavorite(event.id)
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-black/55 border-white/18 text-white'
              }`}
            >
              {isFavorite(event.id) ? '♥' : '♡'}
            </button>
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-black/55 border border-white/18 flex items-center justify-center text-sm text-white"
            >
              ↗
            </button>
            <PosterButton src={event.image_url || event.cover_image_url} />
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

          {/* RSVP („Idę" + licznik + awatary) UKRYTE — wymaga kont/logowania (tier D). */}
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
        {[
          {
            icon: '📅',
            value: nextTerm ? nextTerm.label : (dateRange(event.start_date, event.end_date) || '—'),
            subtext: nextTerm
              ? (nextTerm.remaining > 0 ? `+ ${nextTerm.remaining} ${nextTerm.remaining === 1 ? 'kolejny termin' : 'kolejne terminy'}` : '')
              : (!isMultiDay(event.start_date, event.end_date) ? weekdayName(event.start_date) : ''),
          },
          { icon: '⏰', value: timeLabel || '—', subtext: !isMultiDay(event.start_date, event.end_date) ? durationLabel(event.start_date, event.end_date) : '' },
          { icon: '📍', value: event.city || event.address || '—' },
          { icon: '🎟️', value: event.is_free ? 'Wolny' : event.price_from ? `Od ${event.price_from} PLN` : '—', green: event.is_free },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 border-r border-zinc-800 flex-shrink-0 last:border-r-0">
            <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <div className={`text-[11px] font-bold ${item.green ? 'text-green-400' : 'text-white'}`}>
                {item.value}
              </div>
              {item.subtext && (
                <div className="text-[9px] text-zinc-500 mt-0.5">{item.subtext}</div>
              )}
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
<p className="text-[13.5px] text-zinc-200 leading-relaxed mb-4 whitespace-pre-line">
              {event.description || event.short_description
                ? linkify(event.description || event.short_description, 'dark')
                : 'Brak opisu.'}
            </p>
            <EventDatesList dates={event.event_dates} variant="dark" />

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
                {/* „Obserwuj" UKRYTE — wymaga kont + push (tier D). */}
              </div>
            )}

            {/* Kalendarz — w treści, przewija się ze stroną (jak karta organizatora).
                Udostępnianie jest w hero (prawy górny róg), więc tu tylko kalendarz. */}
            <button
              onClick={() => downloadIcs(event)}
              className="mt-5 w-full py-3.5 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2 bg-green-500 text-black"
            >
              📅 Dodaj do kalendarza
            </button>
          </div>
        )}

        {/* Tab 1: Program (jeśli jest) */}
        {activeTab === 1 && hasTabs && (
          <EventSchedule schedule={event.schedule} eventDate={event.start_date} variant="dark" />
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
              
              <a  href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-black bg-green-500 px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                Nawiguj
              </a>
            </div>

            {event.location_notes && (
              <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-2.5">
                <span className="text-[13px] flex-shrink-0">ℹ️</span>
                <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-line">
                  {event.location_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
"use client"

import { useState } from "react"
import Link from "next/link"
import PosterModal from "@/components/PosterModal"
import { useFavorites } from "@/hooks/useFavorites"
import { dateBadgeParts } from "@/lib/eventFormat"
import { normalizeCategory, CATEGORY_LABELS, CATEGORY_BADGE_CLASSES } from "@/lib/eventCategory"

// 2026-10-07: kompaktowy wiersz wydarzenia na telefon, taki sam jak karta na liście głównej
// (components/MobileHome.tsx), ale bez odległości od użytkownika. Używany na stronie organizatora,
// gdzie duże karty z całym plakatem zajmowały cały ekran na jedno wydarzenie.
export type MobileEventRowData = {
  id: string
  slug: string | null
  title: string
  category: string | null
  schedule_type: string | null
  next_date: string | null
  next_start_time: string | null
  next_end_time: string | null
  venue_name: string | null
  address: string | null
  city: string | null
  is_free: boolean | null
  cover_image_url: string | null
  image_url: string | null
}

export function MobileEventRow({ event }: { event: MobileEventRowData }) {
  const [posterSrc, setPosterSrc] = useState<string | null>(null)
  const { isFavorite, toggleFavorite } = useFavorites()
  const liked = isFavorite(event.id)

  const cat = normalizeCategory(event.category)
  const tagColor = CATEGORY_BADGE_CLASSES[cat] ?? "bg-zinc-600 text-white"
  const tagLabel = CATEGORY_LABELS[cat] ?? cat
  const { day, month, isToday: today, isTomorrow: tomorrow } = dateBadgeParts(event.next_date ?? "")
  const time = event.next_start_time?.slice(0, 5)
  const endTime = event.next_end_time?.slice(0, 5)
  const img = event.cover_image_url || event.image_url
  const posterImg = event.image_url || event.cover_image_url

  return (
    <>
      {posterSrc && <PosterModal src={posterSrc} onClose={() => setPosterSrc(null)} />}
      <Link href={`/events/${event.slug || event.id}`} className="mb-3 block">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="p-3">
            <div className="mb-2 flex items-start justify-between">
              <span className={`rounded-lg px-2 py-1 text-[9px] font-black ${tagColor}`}>{tagLabel.toUpperCase()}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); toggleFavorite(event.id) }}
                  aria-label={liked ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                  className={`flex size-8 items-center justify-center rounded-full text-sm transition-colors ${
                    liked ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {liked ? "♥" : "♡"}
                </button>
                {event.next_date && (event.schedule_type === "recurring" ? (
                  <div className="flex min-w-[42px] flex-col items-center rounded-xl bg-purple-500 px-2.5 py-1">
                    <span className="text-center text-[9px] font-black leading-none text-white">CYKL.</span>
                    <span className="mt-0.5 text-[8px] font-bold leading-none text-white/80">{day} {month}</span>
                  </div>
                ) : (
                  <div
                    className={`flex min-w-[42px] flex-col items-center rounded-xl px-2.5 py-1 ${
                      today ? "bg-green-500" : tomorrow ? "bg-yellow-400" : "bg-zinc-800"
                    }`}
                  >
                    <span className={`text-[16px] font-black leading-none ${today || tomorrow ? "text-black" : "text-white"}`}>
                      {today ? "DZIŚ" : tomorrow ? "JUTRO" : day}
                    </span>
                    {!today && !tomorrow && (
                      <span className="mt-0.5 text-[9px] font-bold leading-none text-zinc-400">{month}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 line-clamp-2 break-words text-[15px] font-black leading-tight text-white [overflow-wrap:anywhere]">
                  {event.title}
                </p>
                {event.venue_name && <p className="mb-0.5 text-[11px] text-zinc-400">👥 {event.venue_name}</p>}
                {event.address && (
                  <p className="mb-0.5 text-[10px] text-zinc-500">
                    📍 {event.address}{event.city ? `, ${event.city}` : ""}
                  </p>
                )}
                {time && (
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    🕐 {time}{endTime ? ` – ${endTime}` : ""}
                  </p>
                )}
                <span
                  className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-[9px] font-bold ${
                    event.is_free
                      ? "border-green-500/20 bg-green-500/10 text-green-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {event.is_free ? "Wstęp wolny" : "Wstęp płatny"}
                </span>
              </div>

              {img && (
                <div className="flex w-20 shrink-0 flex-col gap-1.5">
                  <div className="relative size-20 overflow-hidden rounded-xl border border-zinc-700">
                    <img src={img} alt={event.title} loading="lazy" className="size-full object-cover" />
                  </div>
                  {posterImg && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setPosterSrc(posterImg) }}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-1 py-1.5 text-[9px] font-bold text-green-400"
                    >
                      👁 Plakat
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </>
  )
}
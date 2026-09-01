'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface PosterModalProps {
  src: string
  onClose: () => void
}

/** Pełnoekranowy podgląd plakatu, renderowany przez portal do document.body —
 * omija stacking context stron ze strony szczegółów (hero z transform/sticky
 * potrafi "przebić się" nad zwykłym z-index, portal to trwale rozwiązuje). */
export default function PosterModal({ src, onClose }: PosterModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Kontener o stałej wysokości (88vh) — next/image w trybie fill
          wymaga rodzica z jawnym rozmiarem. object-contain w środku daje
          ten sam efekt co wcześniejsze maxHeight/maxWidth na zwykłym <img>:
          plakat skaluje się w całości, zachowując proporcje. */}
      <div
        className="relative h-[88vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt="Plakat"
          fill
          sizes="100vw"
          className="object-contain rounded-xl"
        />
      </div>
      <button
        onClick={onClose}
        aria-label="Zamknij"
        className="absolute top-5 right-5 w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-white"
      >
        ✕
      </button>
    </div>,
    document.body
  )
}
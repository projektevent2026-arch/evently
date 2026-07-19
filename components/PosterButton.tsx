'use client'

import { useState } from 'react'
import PosterModal from '@/components/PosterModal'

interface PosterButtonProps {
  src?: string | null
}

/** Przycisk w pasku detalu — otwiera pełny plakat. Sam trzyma swój stan. */
export default function PosterButton({ src }: PosterButtonProps) {
  const [open, setOpen] = useState(false)

  if (!src) return null

  return (
    <>
      {open && <PosterModal src={src} onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(true)}
        aria-label="Zobacz plakat"
        className="w-8 h-8 rounded-full bg-black/55 border border-white/18 flex items-center justify-center text-sm text-white"
      >
        👁
      </button>
    </>
  )
}
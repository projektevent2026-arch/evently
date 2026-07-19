'use client'

interface PosterModalProps {
  src: string
  onClose: () => void
}

/** Pełnoekranowy podgląd plakatu. Klik w tło albo ✕ zamyka. */
export default function PosterModal({ src, onClose }: PosterModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="Plakat"
        className="max-h-[88vh] max-w-full object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        aria-label="Zamknij"
        className="absolute top-5 right-5 w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-white"
      >
        ✕
      </button>
    </div>
  )
}
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface EventHeroProps {
  src?: string | null
  alt?: string
}

/**
 * Warstwy tła hero. Renderuje się WEWNĄTRZ istniejącego kontenera hero
 * (ten musi mieć position:relative i overflow:hidden).
 *
 * Pionowy obraz (plakat) -> rozmyte tło + plakat w całości na wierzchu.
 * Poziomy (zdjęcie)      -> wypełnia kadr.
 * Gradient mocny tylko przy dole, gdzie siedzi tekst.
 */
export default function EventHero({ src, alt = '' }: EventHeroProps) {
  const [isPortrait, setIsPortrait] = useState<boolean | null>(null)

  if (!src) return <div style={overlay} />

  return (
    <>
      {isPortrait && (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          style={{
            objectFit: 'cover',
            filter: 'blur(24px) brightness(0.45)',
            transform: 'scale(1.15)',
          }}
        />
      )}

      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        priority
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth && img.naturalHeight) {
            setIsPortrait(img.naturalHeight > img.naturalWidth * 1.05)
          }
        }}
        style={{
          objectFit: isPortrait ? 'contain' : 'cover',
          objectPosition: 'center',
        }}
      />

      <div style={overlay} />
    </>
  )
}

// Gradient: mocny tylko na dole (tam jest tytuł), góra prawie czysta.
const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 20%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
}
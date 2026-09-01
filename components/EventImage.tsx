"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * EventImage — dobiera tryb wyświetlania na podstawie proporcji obrazka.
 *
 *  - PIONOWY plakat (wysoki)  -> object-contain na rozmytym tle (cały widoczny)
 *  - POZIOME / kwadratowe zdjęcie -> object-cover (pełny kadr, edge-to-edge)
 *  - brak zdjęcia / błąd ładowania -> placeholder z ikoną
 *
 * Rozmiar i zaokrąglenie ustawiasz z zewnątrz przez `className`.
 *
 * Użycie w KARCIE:
 *   <EventImage src={event.cover_image_url} alt={event.title}
 *               className="h-52 w-full rounded-t-2xl" />
 *
 * Użycie w HERO (z gradientem i tytułem na wierzchu):
 *   <div className="relative h-[420px] w-full overflow-hidden rounded-3xl">
 *     <EventImage src={event.cover_image_url} alt={event.title} eager
 *                 className="h-full w-full" />
 *     <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
 *     <div className="absolute bottom-0 p-5 text-white">…tytuł, lokalizacja…</div>
 *   </div>
 */

type Fit = "cover" | "contain";

// Poniżej tej proporcji (szerokość / wysokość) traktujemy obraz jak pionowy
// plakat -> pokazujemy w całości. 0.9 = wszystko wyraźnie wyższe niż kwadrat.
// Podnieś, jeśli chcesz częściej "contain"; obniż, jeśli częściej "cover".
const CONTAIN_BELOW_RATIO = 0.9;

interface EventImageProps {
  src?: string | null;
  alt: string;
  /** klasy rozmiaru/zaokrąglenia, np. "h-52 w-full rounded-t-2xl" */
  className?: string;
  /** true dla hero (ładuj od razu), false/pominięte dla kart (lazy) */
  eager?: boolean;
}

export default function EventImage({
  src,
  alt,
  className = "",
  eager = false,
}: EventImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [failed, setFailed] = useState(false);

  function decideFit(img: HTMLImageElement) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    setFit(ratio < CONTAIN_BELOW_RATIO ? "contain" : "cover");
  }

  // Obrazek z cache bywa "complete" zanim podepnie się onLoad — sprawdzamy ręcznie.
  useEffect(() => {
    setFit(null);
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth) decideFit(img);
  }, [src]);

  // --- brak zdjęcia albo błąd: placeholder ---
  if (!src || failed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-zinc-600"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      </div>
    );
  }

  const contain = fit === "contain";

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
      {/* rozmyte tło — tylko dla pionowych plakatów (object-contain).
          Ten sam src i sizes co główny obraz poniżej -> Next.js generuje
          identyczny zoptymalizowany URL dla obu, więc przeglądarka pobiera
          go raz i współdzieli z cache'a (tak jak wcześniej przy zwykłych
          <img>), zamiast podwajać liczbę requestów. */}
      {contain && (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="scale-110 object-cover blur-2xl brightness-50"
        />
      )}
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={eager}
        onLoad={(e) => decideFit(e.currentTarget)}
        onError={() => setFailed(true)}
        className={`relative object-cover transition-opacity duration-200 ${
          contain ? "object-contain" : "object-cover"
        } ${fit === null ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}
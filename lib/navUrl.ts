// lib/navUrl.ts
//
// 2026-10-24: link "Nawiguj". Dotąd był to wyszukiwacz Google Maps po tekście adresu
// (maps/search?query=...), który otwierał kartę miejsca i wymagał jeszcze kliknięcia
// "Trasa". Teraz otwieramy od razu trasę do celu (maps/dir): na telefonie Google Maps
// pokazuje trasę z bieżącej pozycji, jedno dotknięcie "Rozpocznij" od startu.
//
// Cel to współrzędne pinezki wydarzenia (to samo miejsce, które użytkownik widzi na
// mapie na stronie, a organizator mógł je ręcznie poprawić). Gdy współrzędnych nie
// ma albo są nieprawidłowe, wracamy do tekstu adresu.
//
// Pełny automatyczny start nawigacji nie jest możliwy w zwykłym linku https
// (działa tylko w Androidzie przez osobny schemat, którego iOS nie zna).
type Coord = number | string | null | undefined

function toCoord(value: Coord, limit: number): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null
  return n
}

export function navigationUrl(place: {
  latitude?: Coord
  longitude?: Coord
  address?: string | null
  city?: string | null
}): string {
  const lat = toCoord(place.latitude, 90)
  const lon = toCoord(place.longitude, 180)
  // 0,0 to środek oceanu: w bazie oznacza "brak współrzędnych", nie prawdziwy cel.
  const hasCoords = lat !== null && lon !== null && !(lat === 0 && lon === 0)
  const destination = hasCoords
    ? `${lat},${lon}`
    : [place.address, place.city].filter(Boolean).join(", ")
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
}
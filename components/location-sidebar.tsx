"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { MapPin, Navigation, ChevronDown } from "lucide-react"

const MiniMap = dynamic(() => import("@/components/MiniMap"), { ssr: false })

const RADII = [5, 10, 25, 50]

interface GeoResult {
  lat: number
  lng: number
  label: string
}

// Geokoder MIAST — featureType=settlement zawęża wyniki do MIEJSCOWOŚCI
// (miasta / miasteczka / wsie) i odsiewa firmy, ulice, stacje uzdatniania wody.
// Wcześniej "suw" zwracało: "SUW, 28", "Rem-Suw sp. z o.o.", "PWiK SUW Siedlice".
// Sortowanie po place_rank stawia większe miasta wyżej (Suwałki przed wsią Suwałki-kolonia).
async function searchNominatim(query: string): Promise<GeoResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&limit=8&countrycodes=pl&accept-language=pl` +
    `&featureType=settlement&addressdetails=1`

  const res = await fetch(url, {
    headers: { "Accept-Language": "pl", "User-Agent": "Evently/1.0 (evently-silk-omega.vercel.app)" },
  })
  const data = await res.json()

  return (data as any[])
    .map((item) => {
      const a = item.address || {}
      const place = a.city || a.town || a.village || a.municipality || item.name || ""
      const region = a.state || ""
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        label: place && region ? `${place}, ${region}` : (place || String(item.display_name || "").split(",")[0]),
        placeRank: item.place_rank ?? 99,      // niższy = ważniejsza miejscowość
        importance: item.importance ?? 0,      // większe miasta = wyższa wartość
      }
    })
    .filter((r) => r.label && !isNaN(r.lat) && !isNaN(r.lng))
    .sort((x, y) => (x.placeRank - y.placeRank) || (y.importance - x.importance))
    .map(({ lat, lng, label }) => ({ lat, lng, label }))
}

export function LocationSidebar() {
  const [city, setCity] = useState("")
  const [radius, setRadius] = useState(25)
  const [locating, setLocating] = useState(false)
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleGeolocate = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let cityName = "Moja lokalizacja"
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pl`,
            { headers: { "Accept-Language": "pl", "User-Agent": "Evently/1.0" } }
          )
          const data = await res.json()
          cityName = data.address?.city || data.address?.town || data.address?.village || "Moja lokalizacja"
        } catch {}
        setCity(cityName)
        setMapCenter([latitude, longitude])
        setLocating(false)
        const params = new URLSearchParams(searchParams.toString())
        params.set("city", cityName)
        params.set("radius", radius.toString())
        params.set("lat", latitude.toString())
        params.set("lng", longitude.toString())
        router.push(`/?${params.toString()}`, { scroll: false })
      },
      () => setLocating(false)
    )
  }

  // Podpowiedzi w trakcie pisania (od 3 znaków)
  const handleCityChange = async (val: string) => {
    setCity(val)
    if (val.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const results = await searchNominatim(val.trim())
      // usuń duplikaty po etykiecie
      const unique = results.filter(
        (r, i, arr) => arr.findIndex(x => x.label === r.label) === i
      )
      setSuggestions(unique)
      setShowSuggestions(unique.length > 0)
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Wybór miasta z listy albo z Enter — ustawia lat/lng i filtruje
  const applyCity = (r: GeoResult) => {
    setCity(r.label)
    setShowSuggestions(false)
    setMapCenter([r.lat, r.lng])
    const params = new URLSearchParams(searchParams.toString())
    params.set("city", r.label)
    params.set("radius", radius.toString())
    params.set("lat", r.lat.toString())
    params.set("lng", r.lng.toString())
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  // Enter w polu: jeśli są podpowiedzi, weź pierwszą; jeśli nie — dociągnij z geokodera
  const handleCitySearch = async () => {
    if (!city.trim()) return
    if (suggestions.length > 0) {
      applyCity(suggestions[0])
      return
    }
    setSearching(true)
    try {
      const results = await searchNominatim(city.trim())
      if (results[0]) applyCity(results[0])
    } catch {}
    setSearching(false)
  }

  const sidebarContent = (
    <>
      {/* Lokalizacja */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          Lokalizacja
        </h3>

        <button
          onClick={handleGeolocate}
          disabled={locating}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors mb-3"
        >
          <Navigation className="size-4 text-primary" />
          {locating ? "Pobieranie..." : "Użyj mojej lokalizacji"}
        </button>

        <p className="text-xs text-center text-muted-foreground mb-3">lub</p>

        <div className="relative">
          <input
            type="text"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCitySearch() }
              if (e.key === "Escape") setShowSuggestions(false)
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Wpisz miasto i naciśnij Enter..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-background shadow-md overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => applyCity(s)}
                  className="cursor-pointer px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Promień</p>
          <div className="grid grid-cols-4 gap-1.5">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRadius(r)
                  if (city) {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set("radius", r.toString())
                    router.push(`/?${params.toString()}`, { scroll: false })
                  }
                }}
                className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  radius === r
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {city && (
          <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
            <p className="text-xs text-primary font-medium">
              Pokazujemy wydarzenia w promieniu {radius} km od {city}
            </p>
          </div>
        )}
      </div>

      {/* Blisko Ciebie */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Blisko Ciebie</h3>
        <MiniMap center={mapCenter} />
      </div>
    </>
  )

  return (
    <div>
      {/* Mobile — zwijany panel */}
      <div className="lg:hidden flex flex-col gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="size-4 text-primary" />
            Filtry i lokalizacja
            {city && (
              <span className="text-xs font-normal text-muted-foreground">
                · {city} · {radius} km
              </span>
            )}
          </span>
          <ChevronDown
            className={`size-4 text-primary transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`}
          />
        </button>
        {sidebarOpen && <div className="flex flex-col gap-4">{sidebarContent}</div>}
      </div>

      {/* Desktop — zawsze widoczny */}
      <div className="hidden lg:flex lg:flex-col lg:gap-6 sticky top-24">
        {sidebarContent}
      </div>
    </div>
  )
}
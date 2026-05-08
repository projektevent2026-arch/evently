"use client"

import { useState } from "react"
import { MapPin, Navigation } from "lucide-react"

const RADII = [5, 10, 25, 50]

const CATEGORIES = [
  { value: "all", label: "Wszystkie" },
  { value: "music", label: "Koncerty", icon: "🎵" },
  { value: "family", label: "Dla dzieci", icon: "🎠" },
  { value: "sport", label: "Sport", icon: "⚽" },
  { value: "culture", label: "Kultura", icon: "🎭" },
  { value: "food", label: "Jedzenie", icon: "🍕" },
  { value: "technology", label: "Technologia", icon: "💻" },
]

export function LocationSidebar() {
  const [city, setCity] = useState("Suwałki")
  const [radius, setRadius] = useState(25)
  const [locating, setLocating] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleGeolocate = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      () => setLocating(false),
      () => setLocating(false)
    )
  }

  const handleCityChange = async (val: string) => {
    setCity(val)
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(val) + "&limit=5&lang=pl&bbox=14.07,49.00,24.15,54.84"
      const res = await fetch(url)
      const data = await res.json()
      const cities = data.features
        .filter((f: any) => ["city","town","village"].includes(f.properties.type))
        .map((f: any) => f.properties.name)
        .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
      setSuggestions(cities)
      setShowSuggestions(cities.length > 0)
    } catch {
      setSuggestions([])
    }
  }

  return (
    <div className="flex flex-col gap-6 sticky top-24">

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
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Wpisz miasto lub wieś..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-background shadow-md overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => { setCity(s); setShowSuggestions(false) }}
                  className="cursor-pointer px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  {s}
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
                onClick={() => setRadius(r)}
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

        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
          <p className="text-xs text-primary font-medium">
            Pokazujemy wydarzenia w promieniu {radius} km od {city}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Kategorie</h3>
          <button className="text-xs text-primary hover:underline">Zobacz wszystkie</button>
        </div>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent text-left"
            >
              <span className="flex items-center gap-2.5 text-foreground">
                {cat.icon && <span className="text-base">{cat.icon}</span>}
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, MapPin } from "lucide-react"

const TIME_FILTERS = [
  { label: "Dziś", value: "dzis" },
  { label: "Jutro", value: "jutro" },
  { label: "Ten weekend", value: "weekend" },
  { label: "Bezpłatne", value: "bezplatne" },
]

export function HeroSection() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const router = useRouter()
  const activeTime = searchParams.get("time")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    const time = searchParams.get("time")
    if (time) params.set("time", time)
    router.push(`/?${params.toString()}`)
  }

  const handleTimeFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("time") === value) {
      params.delete("time")
    } else {
      params.set("time", value)
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">

          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">Suwałki</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Co robisz dziś<br />
              <span className="text-primary">w Suwałkach?</span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Odkryj najlepsze wydarzenia w swojej okolicy i spędź czas tak, jak lubisz.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Szukaj wydarzeń, artystów, miejsc..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Szukaj
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2">
              {TIME_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleTimeFilter(value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTime === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative h-[420px] w-full overflow-hidden rounded-3xl">
              <img
                src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80"
                alt="Wydarzenie muzyczne"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-3xl" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-background/90 backdrop-blur-sm p-4 border border-border/50">
                <p className="text-xs font-medium text-primary mb-1">DZIŚ · 18:00</p>
                <p className="text-sm font-semibold text-foreground">Dni Suwałk 2026</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bulwary nad Czarną Hańczą</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
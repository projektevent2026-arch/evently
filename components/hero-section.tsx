"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  const [query, setQuery] = useState("")

  return (
    <section className="relative overflow-hidden bg-hero-bg">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-bg/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-hero-bg/30 via-hero-bg/50 to-hero-bg" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Ponad 5 000 wydarzeń w tym tygodniu
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-hero-foreground md:text-5xl lg:text-6xl text-balance">
            Odkryj najlepsze wydarzenia w{" "}
            <span className="text-primary">Twojej okolicy</span>
          </h1>

          <p className="mt-5 text-base leading-relaxed text-hero-foreground/60 md:text-lg text-pretty">
            Koncerty, festiwale, warsztaty i spotkania. Znajdź to, co Cię interesuje, w jednym miejscu.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj wydarzeń, artystów, miejsc..."
                className="h-14 w-full rounded-xl border-0 bg-card/95 pl-12 pr-4 text-card-foreground shadow-lg backdrop-blur-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button className="h-14 w-full rounded-xl px-8 text-base font-semibold shadow-lg transition-all hover:shadow-xl sm:w-auto sm:whitespace-nowrap">
              Szukaj
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-hero-foreground/40">Popularne:</span>
            {["Warszawa", "Kraków", "Suwałki", "Festiwale", "Stand-up"].map((tag) => (
              <button
                key={tag}
                className="rounded-full border border-hero-foreground/15 px-3 py-1 text-sm text-hero-foreground/50 transition-colors hover:border-primary/50 hover:text-primary"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

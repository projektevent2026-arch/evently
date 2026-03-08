"use client"

import { useState } from "react"
import { Music, PartyPopper, Palette, Dumbbell, Baby, UtensilsCrossed } from "lucide-react"

const categories = [
  { name: "Muzyka", icon: Music },
  { name: "Imprezy", icon: PartyPopper },
  { name: "Kultura", icon: Palette },
  { name: "Sport", icon: Dumbbell },
  { name: "Rodzinne", icon: Baby },
  { name: "Jedzenie", icon: UtensilsCrossed },
]

export function CategoryFilters() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">Przeglądaj kategorie</h2>
        <button className="text-sm font-medium text-primary transition-colors hover:text-primary/80">
          Wszystkie
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Filtry kategorii">
        <button
          role="tab"
          aria-selected={active === null}
          onClick={() => setActive(null)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
            active === null
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-foreground/70 hover:border-primary/40 hover:text-primary"
          }`}
        >
          Wszystkie
        </button>

        {categories.map((cat) => {
          const Icon = cat.icon
          const isActive = active === cat.name
          return (
            <button
              key={cat.name}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(isActive ? null : cat.name)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground/70 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Icon className="size-4" />
              {cat.name}
            </button>
          )
        })}
      </div>
    </section>
  )
}

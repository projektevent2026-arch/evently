"use client"

import { useState } from "react"
import { MapPin, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">
            evently
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          <a
            href="#discover"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            Odkryj
          </a>
          <a
            href="#map"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            Mapa
          </a>
          <a
            href="#cities"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            Miasta
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
          >
            Zaloguj się
          </Button>
          <Button size="sm" className="rounded-full">
            Dodaj wydarzenie
          </Button>
        </div>

        <button
          className="flex size-10 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-accent md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-border/60 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            <a
              href="#discover"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Odkryj
            </a>
            <a
              href="#map"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Mapa
            </a>
            <a
              href="#cities"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Miasta
            </a>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
            >
              Zaloguj się
            </Button>
            <Button size="sm" className="w-full rounded-full">
              Dodaj wydarzenie
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

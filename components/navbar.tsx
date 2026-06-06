"use client"

import { useState } from "react"
import { MapPin, Menu, X, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, role, loading } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const isStaff = role === "admin" || role === "moderator"

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16 lg:px-8">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">evently</span>
        </a>

        {/* Prawa strona - desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <a href="/mapa" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Mapa
          </a>

          {!loading && (
            user ? (
              <>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="size-4" />
                  Ulubione
                </button>
                {isStaff && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Panel
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleLogout}
                >
                  Wyloguj się
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => router.push("/login")}
              >
                Zaloguj się
              </Button>
            )
          )}
          <Button
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => router.push(isStaff ? "/admin/wydarzenia" : "/dodaj-wydarzenie")}
          >
            + Dodaj wydarzenie
          </Button>
        </div>

        {/* Hamburger mobile */}
        <button
          className="flex size-10 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-accent md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/60 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            <a
              href="/mapa"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
            >
              Mapa wydarzeń
            </a>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
            {!loading && (
              user ? (
                <>
                  {isStaff && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full"
                      onClick={() => { router.push("/admin"); setMobileMenuOpen(false) }}
                    >
                      Panel admina
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full border-primary/30 text-primary"
                    onClick={handleLogout}
                  >
                    Wyloguj się
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full border-primary/30 text-primary"
                  onClick={() => router.push("/login")}
                >
                  Zaloguj się
                </Button>
              )
            )}
            <Button
              size="sm"
              className="w-full rounded-full"
              onClick={() => router.push(isStaff ? "/admin/wydarzenia" : "/dodaj-wydarzenie")}
            >
              + Dodaj wydarzenie
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
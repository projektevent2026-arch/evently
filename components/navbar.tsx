"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Plus, Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useFavorites } from "@/hooks/useFavorites"

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  // Ulubione na localStorage — NIE wymagają konta. Licznik zsynchronizowany z sercami.
  const { count } = useFavorites()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            setIsAdmin(profile?.role === "admin" || profile?.role === "moderator")
          })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setIsAdmin(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <a href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">evently</span>
        </a>

        <nav className="flex items-center gap-3">
          <Link
            href="/mapa"
            className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Mapa
          </Link>

          {/* Ulubione — WIDOCZNE ZAWSZE (localStorage, bez konta). Licznik pokazuje zapisane. */}
          <Link
            href="/ulubione"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="relative">
              <Heart className={`size-4 ${count > 0 ? "fill-red-500 text-red-500" : ""}`} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
            Ulubione
          </Link>

          {user && isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Panel
            </Link>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-primary hover:underline"
            >
              Wyloguj się
            </button>
          ) : (
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Zaloguj się
            </Link>
          )}

          <Button
            asChild
            size="sm"
            className="rounded-full bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dodaj-wydarzenie">
              <Plus className="mr-1 size-4" />
              Dodaj wydarzenie
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
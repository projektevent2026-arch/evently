"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Plus, Heart, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useFavorites } from "@/hooks/useFavorites"
import { RoleBadge } from "@/components/RoleBadge"

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  // Osobna flaga od isAdmin — organizator dostaje inny link ("Moje
  // wydarzenia" zamiast "Panel"), bo nie ma dostępu do pełnego /admin.
  const [isOrganizer, setIsOrganizer] = useState(false)
  // 2026-09-30: awatar + rozwijane menu (Mój profil / Wyloguj się) zamiast
  // samego tekstowego "Wyloguj się" — wizualny znak zalogowania, tylko dla
  // organizatorów (mają stronę profilu; admin na razie nie).
  const [avatarUrl, setAvatarUrl] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 2026-09-30: nasłuch na całym dokumencie zamiast niewidocznej warstwy
  // "fixed inset-0" — ta druga nie działała poprawnie, bo nagłówek ma
  // backdrop-blur-xl, a filtr/backdrop-filter na przodku tworzy nowy
  // "containing block" dla potomków position:fixed w przeglądarkach —
  // fixed-warstwa była wtedy ograniczona do granic samego nagłówka
  // (64px), nie całej strony, więc klik niżej na stronie jej nie trafiał.
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])
  // Ulubione na localStorage — NIE wymagają konta. Licznik zsynchronizowany z sercami.
  const { count } = useFavorites()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from("profiles")
          .select("role, avatar_url")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            setIsAdmin(profile?.role === "admin" || profile?.role === "moderator")
            setIsOrganizer(profile?.role === "organizer")
            setAvatarUrl(profile?.avatar_url || "")
          })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
        setIsOrganizer(false)
      }
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
      {/* Link zamiast zwykłego <a> — <a> wymuszał pełne przeładowanie strony
          przez przeglądarkę (jak F5), co dawało zauważalny "skok" i migający
          ekran ładowania przy powrocie na stronę główną z innej podstrony. */}
      <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">evently</span>
        </Link>

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
            <>
              <Link
                href="/admin"
                className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Panel
              </Link>
              <RoleBadge className="hidden sm:inline-block" />
            </>
          )}

          {user && isOrganizer && (
            <Link
              href="/moje-wydarzenia"
              className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Moje wydarzenia
            </Link>
          )}

          {user && isOrganizer ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center justify-center size-8 rounded-full bg-muted overflow-hidden border border-border"
                aria-label="Menu konta"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <User className="size-4 text-muted-foreground" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-44 rounded-lg border border-border bg-background shadow-lg py-1">
                  <Link
                    href="/moje-wydarzenia/profil"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Mój profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          ) : user ? (
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
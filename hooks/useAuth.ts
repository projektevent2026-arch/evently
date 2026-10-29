import { useEffect, useLayoutEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// 2026-10-28: `loading` zostaje true, dopóki nie znamy też roli. Wcześniej loading kończył się po
// getSession(), a rola dochodziła osobnym zapytaniem chwilę później. Ekran "Więcej" pokazywał wtedy
// najpierw samo "Wyloguj się", a "Mój profil" i "Moje wydarzenia" dopiero po chwili (przeskok układu).
//
// 2026-10-29: `hint` = ostatnio znany stan konta zapamiętany w przeglądarce ("none" albo rola).
// Dzięki niemu ekran "Więcej" już w pierwszej klatce wie, ile wierszy będzie miała sekcja "Konto",
// i rysuje zaślepkę tej samej wysokości. Hint służy WYŁĄCZNIE do układu strony (liczba wierszy),
// nigdy do uprawnień: prawdziwe dane (user, role) i tak przychodzą z Supabase.
const HINT_KEY = "evently_auth_hint"

function readHint(): string | null {
  try {
    return localStorage.getItem(HINT_KEY)
  } catch {
    return null
  }
}

function writeHint(value: string) {
  try {
    localStorage.setItem(HINT_KEY, value)
  } catch {
    // localStorage niedostępny (tryb prywatny): hint jest tylko dla wygody
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hint, setHint] = useState<string | null>(null)

  // Layout effect (przed pierwszym rysowaniem), żeby nie było klatki z błędną wysokością.
  useLayoutEffect(() => {
    setHint(readHint())
  }, [])

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
    const r = data?.role ?? "user"
    setRole(r)
    writeHint(r)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await fetchRole(u.id)
      else { setRole(null); writeHint("none") }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchRole(u.id)
      else { setRole(null); writeHint("none") }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, role, loading, hint }
}
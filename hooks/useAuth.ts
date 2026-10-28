import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// 2026-10-28: `loading` zostaje true, dopóki nie znamy też roli. Wcześniej loading kończył się po
// getSession(), a rola dochodziła osobnym zapytaniem chwilę później. Ekran "Więcej" pokazywał wtedy
// najpierw samo "Wyloguj się", a "Mój profil" i "Moje wydarzenia" dopiero po chwili (przeskok układu).
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
    setRole(data?.role ?? "user")
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await fetchRole(u.id)
      else setRole(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchRole(u.id)
      else setRole(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, role, loading }
}
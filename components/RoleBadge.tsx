"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// 2026-10-06: mały znacznik "Administrator" / "Moderator" przy zalogowanym
// koncie personelu, żeby przy testowaniu różnych ról od razu było widać,
// na którym koncie jesteś. Dla organizatora, zwykłego użytkownika i
// niezalogowanych nie pokazuje nic. Rola pochodzi z tabeli profiles (ta sama
// kolumna, z której korzysta reszta aplikacji), a to tylko etykieta: samo
// uprawnienia nadaje RLS w bazie i kontrola w API, nie ten komponent.
const LABELS: Record<string, string> = {
  admin: "Administrator",
  moderator: "Moderator",
}

export function RoleBadge({ className = "" }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setLabel(null)
        return
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (!cancelled) setLabel(LABELS[data?.role ?? ""] ?? null)
    }

    load()
    const { data: listener } = supabase.auth.onAuthStateChange(() => { load() })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!label) return null

  return (
    <span
      className={`whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold leading-none text-primary ${className}`}
    >
      {label}
    </span>
  )
}
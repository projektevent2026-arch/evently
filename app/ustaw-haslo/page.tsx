"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Jedna strona obsługuje DWA scenariusze, bo Supabase używa tego samego
// mechanizmu dla obu: link z zaproszenia (Auth -> Users -> Invite) i link
// z "zapomniałem hasła" (resetPasswordForEmail) oba lądują tutaj z tokenem
// w adresie. Klient Supabase (@supabase/ssr, createBrowserClient) sam
// przetwarza ten token przy wczytaniu strony i zakłada sesję — nie robimy
// tego ręcznie, tylko czekamy na zdarzenie i sprawdzamy czy się udało.
export default function UstawHaslo() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [sessionOk, setSessionOk] = useState(false)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function init() {
      // Klient używa domyślnego flowType dla @supabase/ssr, czyli "pkce" —
      // link z zaproszenia/resetu przychodzi jako ?code=... w adresie,
      // NIE jako #access_token=... (to była pierwotna, błędna obsługa
      // tylko starszego formatu). Trzeba jawnie wymienić kod na sesję.
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setChecking(false)
          return
        }
        setSessionOk(true)
        setChecking(false)
        return
      }

      // Zostaje jako zabezpieczenie na wypadek starszego formatu linku
      // (#access_token=...), który klient i tak przetwarza automatycznie.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setSessionOk(true)
      setChecking(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionOk(true)
        setChecking(false)
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.")
      return
    }
    if (password !== password2) {
      setError("Hasła nie są takie same.")
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError("Nie udało się zapisać hasła: " + updateError.message)
      return
    }

    setDone(true)
    setTimeout(() => router.push("/"), 2000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Ustaw hasło</h1>

        {checking && (
          <p className="text-sm text-muted-foreground">Sprawdzanie linku...</p>
        )}

        {!checking && !sessionOk && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-500">
              Ten link jest nieprawidłowy albo już wygasł.
            </p>
            <p className="text-sm text-muted-foreground">
              Poproś o nowe zaproszenie, albo wróć do logowania i skorzystaj
              z opcji "Zapomniałeś hasła?".
            </p>
            <Link href="/login" className="text-primary hover:underline text-sm">
              Wróć do logowania
            </Link>
          </div>
        )}

        {!checking && sessionOk && !done && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Nowe hasło (min. 8 znaków)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              placeholder="Powtórz hasło"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Zapisywanie..." : "Ustaw hasło"}
            </button>
          </form>
        )}

        {done && (
          <p className="text-sm text-green-600">
            Hasło ustawione. Za chwilę przekierujemy Cię na stronę główną...
          </p>
        )}
      </div>
    </main>
  )
}
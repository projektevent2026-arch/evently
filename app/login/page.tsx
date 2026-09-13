"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Tryb "zapomniałem hasła" — ten sam mechanizm co zaproszenia
  // (Supabase wysyła link, który ląduje na /ustaw-haslo). Trzymane
  // jako prosty przełącznik na tej samej stronie, bez osobnego routingu.
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Nieprawidłowy email lub hasło")
      setLoading(false)
      return
    }

    router.push("/")
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError("")
    setForgotLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/ustaw-haslo`,
    })

    setForgotLoading(false)

    if (error) {
      setForgotError("Nie udało się wysłać maila: " + error.message)
      return
    }

    setForgotSent(true)
  }

  if (forgotMode) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-bold">Zresetuj hasło</h1>

          {forgotSent ? (
            <p className="text-sm text-green-600">
              Jeśli to konto istnieje, wysłaliśmy na nie link do ustawienia
              nowego hasła. Sprawdź skrzynkę.
            </p>
          ) : (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
              />
              {forgotError && <p className="text-sm text-red-500">{forgotError}</p>}
              <button
                type="submit"
                disabled={forgotLoading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {forgotLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
              </button>
            </form>
          )}

          <button
            onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError("") }}
            className="mt-4 text-center text-sm text-muted-foreground hover:underline w-full"
          >
            ← Wróć do logowania
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Zaloguj się</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>
        <button
          onClick={() => setForgotMode(true)}
          className="mt-4 text-center text-sm text-muted-foreground hover:underline w-full"
        >
          Zapomniałeś hasła?
        </button>
      </div>
    </main>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// KLUCZOWA ZASADA (potwierdzona niezależnie przez trzy źródła): token
// z zaproszenia jest jednorazowy, a skanery bezpieczeństwa poczty
// (Outlook/Defender, czasem Gmail) same "odwiedzają" linki z maila
// zaraz po dostarczeniu, zanim człowiek go zobaczy. Jeśli sam GET na
// tę stronę zużywałby token (np. verifyOtp w useEffect przy wczytaniu),
// skaner zużyje go pierwszy i człowiek dostanie martwy link — dokładnie
// to działo się wcześniej z linkiem prowadzącym wprost do Supabase.
//
// Rozwiązanie: ta strona przy zwykłym GET tylko WYŚWIETLA przycisk,
// nic nie konsumuje. Token jest zużywany DOPIERO w onClick — czyli
// wymaga realnej interakcji człowieka, czego automatyczny skaner nie
// robi (nie wykonuje JS-owych onClick, najwyżej wczytuje stronę).
//
// NIGDY nie przenoś supabase.auth.verifyOtp() do useEffect — to
// dokładnie ten błąd, który przesuwa problem zamiast go rozwiązać.
//
// Parametry z adresu czytane ręcznie przez window.location.search
// (nie useSearchParams z next/navigation) — ten drugi wymaga
// opakowania w <Suspense> przy statycznym renderowaniu strony i psuł
// build ("should be wrapped in a suspense boundary"). Ten sam wzorzec
// już działa bez problemu w /ustaw-haslo.
export default function PotwierdzZaproszenie() {
  const router = useRouter()
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [type, setType] = useState("invite")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTokenHash(params.get("token_hash"))
    setType(params.get("type") || "invite")
  }, [])

  const handleConfirm = async () => {
    if (!tokenHash) {
      setStatus("error")
      return
    }
    setStatus("loading")

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "email" | "magiclink" | "recovery",
    })

    if (error) {
      setStatus("error")
      return
    }

    // verifyOtp zakłada sesję od razu — /ustaw-haslo ją wykryje
    // (ten sam mechanizm getSession(), który już tam jest).
    router.push("/ustaw-haslo")
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">Zaproszenie do Evently</h1>

        {!tokenHash ? (
          <p className="text-sm text-red-500">
            Ten link jest nieprawidłowy. Poproś o nowe zaproszenie.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Zostałeś zaproszony do dodawania wydarzeń w Evently.
              Kliknij poniżej, żeby przyjąć zaproszenie i ustawić hasło.
            </p>
            <button
              onClick={handleConfirm}
              disabled={status === "loading"}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {status === "loading" ? "Potwierdzanie..." : "Przyjmuję zaproszenie"}
            </button>
            {status === "error" && (
              <p className="mt-4 text-sm text-red-500">
                Link wygasł albo już został użyty. Poproś o nowe zaproszenie.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
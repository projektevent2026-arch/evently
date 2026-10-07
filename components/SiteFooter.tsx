"use client"

import { usePathname } from "next/navigation"
import { Footer } from "@/components/footer"

// 2026-10-07: globalna stopka z linkami (Kontakt, FAQ, Zgłoś treść, Regulamin, Polityka prywatności) tylko na
// KOMPUTERZE, pod każdą stroną z treścią (standard dla stron internetowych). Na telefonie i w PWA te linki są
// w zakładce "Więcej" w dolnym menu (components/MoreMenu.tsx), jak w innych aplikacjach mobilnych.
//
// Nie pokazujemy jej tam, gdzie by przeszkadzała albo jest zbędna:
//  - panele i logowanie (/admin, /moje-wydarzenia, /login, /register, /ustaw-haslo, /potwierdz-zaproszenie),
//  - /mapa (mapa na cały ekran),
//  - /dodaj-wydarzenie (linki do regulaminu i polityki są przy przycisku wysyłania formularza).
const HIDDEN_PREFIXES = [
  "/admin",
  "/moje-wydarzenia",
  "/login",
  "/register",
  "/ustaw-haslo",
  "/potwierdz-zaproszenie",
  "/mapa",
  "/dodaj-wydarzenie",
]

export function shouldShowFooter(pathname: string): boolean {
  return !HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function SiteFooter() {
  const pathname = usePathname() ?? ""
  if (!shouldShowFooter(pathname)) return null

  return (
    <div className="hidden md:block">
      <Footer />
    </div>
  )
}
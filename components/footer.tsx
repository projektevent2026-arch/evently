import { MapPin } from "lucide-react"
import { ADMIN_EMAIL } from "@/lib/siteConfig"

// 2026-10-02: "Kontakt" i "Zgłoś treść" prowadzą do adresu administratora
// (punkt kontaktowy wymagany przez DSA, art. 11-12, oraz mechanizm
// zgłaszania nielegalnych treści, art. 16). Martwy link "O nas" (href="#")
// usunięty — strona "O nas" nie istnieje.
export function Footer() {
  const reportHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent("Zgłoszenie treści w serwisie Evently")}`

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <MapPin className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-primary">evently</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground" aria-label="Stopka">
            <a href={`mailto:${ADMIN_EMAIL}`} className="transition-colors hover:text-primary">Kontakt</a>
            <a href={reportHref} className="transition-colors hover:text-primary">Zgłoś treść</a>
            <a href="/regulamin" className="transition-colors hover:text-primary">Regulamin</a>
            <a href="/polityka-prywatnosci" className="transition-colors hover:text-primary">Polityka prywatności</a>
          </nav>

          <p className="text-sm text-muted-foreground">
            {"© 2026 Evently. Wszelkie prawa zastrzeżone."}
          </p>
        </div>
      </div>
    </footer>
  )
}
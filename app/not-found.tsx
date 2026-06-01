import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-8xl font-black text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">Nie znaleziono strony</h1>
      <p className="text-muted-foreground">Ta strona nie istnieje lub została usunięta.</p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Wróć na stronę główną
      </Link>
    </div>
  )
}
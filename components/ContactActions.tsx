"use client"

import { useState } from "react"

// 2026-10-06: przyciski kontaktu, które działają także wtedy, gdy komputer nie ma
// skonfigurowanego programu pocztowego (link mailto: otwierał wtedy okno logowania
// do Outlooka zamiast wiadomości). Trzy drogi: skopiować adres, napisać w Gmailu
// (nowa karta) albo otworzyć domyślny program pocztowy.
export function ContactActions({ email, subject, body }: { email: string; subject: string; body: string }) {
  const [copied, setCopied] = useState(false)

  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Schowek zablokowany: adres i tak jest widoczny jako zwykły tekst na stronie.
    }
  }

  const btn =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a href={gmail} target="_blank" rel="noopener noreferrer" className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>
        Napisz w Gmailu
      </a>
      <a href={mailto} className={btn}>
        Program pocztowy
      </a>
      <button type="button" onClick={copyAddress} className={btn}>
        {copied ? "Skopiowano" : "Skopiuj adres"}
      </button>
    </div>
  )
}
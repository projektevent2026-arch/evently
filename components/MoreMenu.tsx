"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Building2, CalendarDays, ChevronRight, CircleHelp, FileText, Flag,
  LayoutDashboard, LogIn, LogOut, Mail, ShieldCheck, User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"

// 2026-10-07: ekran "Więcej" (piąta zakładka dolnego menu na telefonie i w PWA). Dwie sekcje:
//  - "Konto": logowanie organizatora i skróty do jego paneli (wcześniej logowanie na telefonie było
//    ukryte w małej ikonie obok logo),
//  - "Informacje": kontakt, FAQ, zgłaszanie treści, regulamin, polityka prywatności (wymóg łatwego dostępu).
// Gdy pojawią się konta dla wszystkich użytkowników, zakładkę można przemianować na "Profil", a sekcję "Konto"
// rozbudować; sekcja "Informacje" zostaje bez zmian.
type Item = { href: string; icon: LucideIcon; label: string; hint?: string }

const INFO: Item[] = [
  { href: "/kontakt", icon: Mail, label: "Kontakt" },
  { href: "/faq", icon: CircleHelp, label: "Pytania i odpowiedzi" },
  { href: "/kontakt#zglos-tresc", icon: Flag, label: "Zgłoś treść" },
  { href: "/regulamin", icon: FileText, label: "Regulamin" },
  { href: "/polityka-prywatnosci", icon: ShieldCheck, label: "Polityka prywatności" },
  { href: "/kontakt#organizator", icon: Building2, label: "Dla organizatorów" },
]

const rowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-white transition-colors active:bg-zinc-800"

function LinkRow({ href, icon: Icon, label, hint }: Item) {
  return (
    <li>
      <Link href={href} className={rowClass}>
        <Icon size={20} className="shrink-0 text-green-500" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {label}
          {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
        </span>
        <ChevronRight size={18} className="shrink-0 text-zinc-500" aria-hidden="true" />
      </Link>
    </li>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</h2>
      <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {children}
      </ul>
    </section>
  )
}

export default function MoreMenu() {
  const { user, role, loading } = useAuth()

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const isStaff = role === "admin" || role === "moderator"

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-28 text-white">
      <div className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="text-2xl font-black tracking-tight">Więcej</h1>

        {!loading && (
          <Section title="Konto">
            {!user && <LinkRow href="/login" icon={LogIn} label="Zaloguj się" hint="Konto organizatora" />}
            {user && role === "organizer" && (
              <>
                <LinkRow href="/moje-wydarzenia/profil" icon={User} label="Mój profil" />
                <LinkRow href="/moje-wydarzenia" icon={CalendarDays} label="Moje wydarzenia" />
              </>
            )}
            {user && isStaff && <LinkRow href="/admin" icon={LayoutDashboard} label="Panel admina" />}
            {user && (
              <li>
                <button type="button" onClick={logout} className={rowClass}>
                  <LogOut size={20} className="shrink-0 text-green-500" aria-hidden="true" />
                  <span className="flex-1">Wyloguj się</span>
                </button>
              </li>
            )}
          </Section>
        )}

        <Section title="Informacje">
          {INFO.map((item) => (
            <LinkRow key={item.href} {...item} />
          ))}
        </Section>

        <p className="mt-6 text-center text-xs text-zinc-500">© 2026 Evently</p>
      </div>
    </main>
  )
}
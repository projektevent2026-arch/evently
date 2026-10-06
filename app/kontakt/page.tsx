import { ADMIN_EMAIL, field } from "@/lib/siteConfig"
import { ContactActions } from "@/components/ContactActions"

export const metadata = {
  title: "Kontakt — Evently",
}

// Tematy i szablony. Szablon zgłoszenia treści odpowiada §7 regulaminu (pkt 2 a-d)
// i art. 16 DSA. Zawartość szablonu to tylko podpowiedź: osoba pisząca może ją dowolnie zmienić.
const TOPICS = [
  {
    id: "blad",
    title: "Zgłoszenie błędu w serwisie",
    text: "Coś nie działa albo wygląda źle.",
    subject: "Evently: błąd w serwisie",
    body: "Co się stało:\n\nNa której stronie (adres):\n\nUrządzenie i przeglądarka:\n",
  },
  {
    id: "zglos-tresc",
    title: "Zgłoszenie nielegalnej treści",
    text: "Treść, którą uważasz za niezgodną z prawem. Opisz ją tak, żeby dało się ją znaleźć i ocenić.",
    subject: "Evently: zgłoszenie treści",
    body:
      "1. Adres strony z treścią:\n\n2. Dlaczego uważasz, że treść jest nielegalna:\n\n3. Imię i nazwisko oraz adres e-mail zgłaszającego:\n\n4. Oświadczam, że działam w dobrej wierze, a podane informacje są dokładne i kompletne.\n",
  },
  {
    id: "dane",
    title: "Dane osobowe",
    text: "Prośba o dostęp, sprostowanie albo usunięcie Twoich danych (RODO).",
    subject: "Evently: dane osobowe",
    body: "Czego dotyczy prośba (dostęp / sprostowanie / usunięcie / inne):\n\nAdres e-mail konta lub zgłoszenia, którego dotyczy:\n",
  },
  {
    id: "organizator",
    title: "Jestem organizatorem",
    text: "Chcesz dodać wydarzenie, dostać konto organizatora albo poprawić dane wydarzenia.",
    subject: "Evently: organizator",
    body: "Nazwa organizacji:\n\nMiasto:\n\nCzego potrzebujesz (dodanie wydarzenia / konto organizatora / poprawka / inne):\n",
  },
  {
    id: "inne",
    title: "Inna sprawa",
    text: "Pytanie, uwaga albo pomysł.",
    subject: "Evently: wiadomość",
    body: "",
  },
]

export default function KontaktPage() {
  const email = field(ADMIN_EMAIL, "e-mail")

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-2xl font-bold">Kontakt</h1>
      <p className="mb-2">
        Napisz na adres <strong className="break-all">{email}</strong>. Wybierz poniżej temat, a otworzymy gotową
        wiadomość z podpowiedzią, co w niej napisać. Rozmawiamy po polsku.
      </p>
      <p className="mb-8 text-sm text-zinc-500">
        Ten adres jest też punktem kontaktowym w rozumieniu art. 11 i 12 rozporządzenia (UE) 2022/2065 (Akt o usługach
        cyfrowych), zgodnie z <a href="/regulamin" className="underline underline-offset-2">Regulaminem</a>.
      </p>

      <div className="space-y-4">
        {TOPICS.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t.text}</p>
            <ContactActions email={ADMIN_EMAIL.trim() || email} subject={t.subject} body={t.body} />
          </section>
        ))}
      </div>
    </main>
  )
}
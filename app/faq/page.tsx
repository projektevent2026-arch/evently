export const metadata = {
    title: "FAQ — Evently",
    description: "Najczęstsze pytania o serwis Evently: dodawanie wydarzeń, konta organizatorów, ulubione, dane osobowe.",
  }
  
  // 2026-10-06: odpowiedzi opisują to, co serwis faktycznie robi dziś i odsyłają do
  // Regulaminu i Polityki prywatności. Przy zmianie zasad (np. moderacji, kont, płatności)
  // zaktualizuj tutaj odpowiedni punkt, żeby FAQ nie rozjechało się z regulaminem.
  const FAQ: { q: string; a: React.ReactNode }[] = [
    {
      q: "Czym jest Evently?",
      a: (
        <>
          Bezpłatny katalog wydarzeń lokalnych w regionie Suwałk: koncertów, festynów, jarmarków, wydarzeń kulturalnych i
          sportowych. W jednym miejscu widzisz, co dzieje się w pobliżu, z datą, godziną i miejscem.
        </>
      ),
    },
    {
      q: "Czy serwis jest płatny?",
      a: (
        <>
          Dla odwiedzających i organizatorów serwis jest dziś bezpłatny. Same wydarzenia mogą mieć wstęp wolny albo płatny.
          Evently nie sprzedaje biletów ani nie pośredniczy w płatnościach, a przy płatnych wydarzeniach odsyła do ich
          sprzedawców.
        </>
      ),
    },
    {
      q: "Jak dodać wydarzenie?",
      a: (
        <>
          Wejdź w „Dodaj” i wypełnij formularz, bez zakładania konta. Możesz też zrobić zdjęcie plakatu lub wgrać jego plik, a
          funkcja odczytu plakatu uzupełni dane za Ciebie. Odczytane informacje trafiają do formularza, w którym możesz je
          poprawić przed wysłaniem.
        </>
      ),
    },
    {
      q: "Dlaczego zgłoszone wydarzenie nie jest od razu widoczne?",
      a: (
        <>
          Zgłoszenia wysłane bez konta są sprawdzane przed publikacją. Dopiero po zatwierdzeniu wydarzenie pojawia się na
          liście. Organizatorzy z Kontem publikują od razu. Szczegóły są w{" "}
          <a href="/regulamin" className="underline underline-offset-2">Regulaminie</a> (§4).
        </>
      ),
    },
    {
      q: "Jak dostać konto organizatora?",
      a: (
        <>
          Konta zakładamy na zaproszenie. Napisz przez <a href="/kontakt#organizator" className="underline underline-offset-2">Kontakt</a>{" "}
          (temat „Jestem organizatorem”), a odpowiemy, jak je założyć. Konto pozwala dodawać i edytować własne wydarzenia,
          a Twoja nazwa, zdjęcie i opis pojawiają się na stronie organizatora.
        </>
      ),
    },
    {
      q: "Jak poprawić lub usunąć wydarzenie?",
      a: (
        <>
          Jeśli dodałeś je z Konta Organizatora, zrobisz to w panelu „Moje wydarzenia”. Jeśli zgłosiłeś je bez konta, napisz
          przez <a href="/kontakt" className="underline underline-offset-2">Kontakt</a>. Usunięte wydarzenie trafia do kosza
          i po 30 dniach jest trwale usuwane.
        </>
      ),
    },
    {
      q: "Co się dzieje z plakatem, który skanuję?",
      a: (
        <>
          Przesłany plakat jest przekazywany do dostawcy usług AI wyłącznie po to, żeby odczytać z niego dane do formularza.
          Opisaliśmy to w{" "}
          <a href="/polityka-prywatnosci" className="underline underline-offset-2">Polityce prywatności</a>. Jeśli wolisz,
          możesz wypełnić formularz ręcznie.
        </>
      ),
    },
    {
      q: "Gdzie są moje ulubione?",
      a: (
        <>
          Zapisują się tylko w Twojej przeglądarce, a nie na koncie ani na naszym serwerze. Dlatego nie przeniosą się na inne
          urządzenie, a po wyczyszczeniu danych przeglądarki znikną. Wydarzenia, które się już skończyły, są z ulubionych
          usuwane automatycznie.
        </>
      ),
    },
    {
      q: "Jak zgłosić błąd, nielegalną treść albo poprosić o usunięcie danych?",
      a: (
        <>
          Wszystko przez stronę <a href="/kontakt" className="underline underline-offset-2">Kontakt</a>: są tam osobne tematy
          z gotowymi szablonami wiadomości. Treść, którą uważasz za nielegalną, zgłosisz też z odnośnika „Zgłoś treść” w
          stopce. Zasady opisuje <a href="/regulamin" className="underline underline-offset-2">Regulamin</a> (§7).
        </>
      ),
    },
  ]
  
  export default function FaqPage() {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
        <h1 className="mb-2 text-2xl font-bold">Najczęstsze pytania</h1>
        <p className="mb-8 text-zinc-500">Krótkie odpowiedzi o tym, jak działa Evently.</p>
  
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-border bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span aria-hidden="true" className="shrink-0 text-xl leading-none text-primary">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <div className="px-5 pb-5 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">{item.a}</div>
            </details>
          ))}
        </div>
  
        <p className="mt-8 text-sm text-zinc-500">
          Nie znalazłeś odpowiedzi? Napisz przez <a href="/kontakt" className="underline underline-offset-2">Kontakt</a>.
        </p>
      </main>
    )
  }
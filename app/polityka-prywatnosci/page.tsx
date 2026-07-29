export const metadata = {
    title: "Polityka Prywatności — Evently",
  };
  
  export default function PolitykaPrywatnosciPage() {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
        <h1 className="mb-2 text-2xl font-bold">
          Polityka Prywatności serwisu Evently
        </h1>
        <p className="mb-8 text-sm text-zinc-500">
          Ostatnia aktualizacja: [UZUPEŁNIJ: data]
        </p>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">1. Administrator danych</h2>
          <p>
            Administratorem danych osobowych jest [UZUPEŁNIJ: imię i nazwisko /
            nazwa administratora] [UZUPEŁNIJ: jeśli dotyczy — adres oraz NIP].
            Kontakt w sprawach danych osobowych: [UZUPEŁNIJ: e-mail].
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">
            2. Jakie dane przetwarzamy i w jakim celu
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Zgłoszenie wydarzenia:</strong> podczas zgłaszania
              wydarzenia zbieramy adres e-mail organizatora oraz dane podane w
              formularzu (m.in. nazwę organizatora oraz dane wydarzenia). Adres
              e-mail wykorzystujemy wyłącznie w celu obsługi zgłoszenia i
              ewentualnego kontaktu w jego sprawie.
            </li>
            <li>
              <strong>Dane techniczne:</strong> korzystamy z anonimowych statystyk
              odwiedzin (Vercel Analytics), które nie wykorzystują plików cookie i
              nie identyfikują konkretnych osób.
            </li>
            <li>
              <strong>Dane zapisywane w przeglądarce:</strong> ulubione wydarzenia
              oraz preferencje lokalizacji zapisywane są lokalnie w Twojej
              przeglądarce (localStorage) i nie są przesyłane do Administratora.
            </li>
          </ul>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">
            3. Podstawa prawna przetwarzania
          </h2>
          <p>
            Dane podane w formularzu zgłoszenia przetwarzamy na podstawie art. 6
            ust. 1 lit. b oraz lit. f RODO (podjęcie działań na żądanie osoby
            zgłaszającej oraz prawnie uzasadniony interes polegający na prowadzeniu
            i moderacji Serwisu). Podanie danych jest dobrowolne, ale niezbędne do
            zgłoszenia wydarzenia.
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">4. Odbiorcy danych</h2>
          <p>
            Dane są przechowywane i przetwarzane z wykorzystaniem usług dostawców
            infrastruktury: Supabase oraz Vercel. Dostawcy ci mogą przetwarzać dane
            poza Europejskim Obszarem Gospodarczym (m.in. w USA), z zastosowaniem
            odpowiednich zabezpieczeń wymaganych przez RODO.
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">5. Okres przechowywania</h2>
          <p>
            Dane związane ze zgłoszeniem wydarzenia przechowujemy przez czas
            niezbędny do jego obsługi i prezentacji wydarzenia w Serwisie, a
            następnie do czasu wniesienia sprzeciwu lub ustania prawnie
            uzasadnionego interesu Administratora.
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">6. Twoje prawa</h2>
          <p>
            Przysługuje Ci prawo do: dostępu do swoich danych, ich sprostowania,
            usunięcia, ograniczenia przetwarzania, wniesienia sprzeciwu oraz
            przenoszenia danych. Masz również prawo wniesienia skargi do Prezesa
            Urzędu Ochrony Danych Osobowych (PUODO). W celu realizacji swoich praw
            skontaktuj się pod adresem: [UZUPEŁNIJ: e-mail].
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">7. Pliki cookie</h2>
          <p>
            Serwis nie wykorzystuje plików cookie w celach marketingowych ani
            analitycznych. Niezbędny technicznie plik sesji wykorzystywany jest
            wyłącznie w panelu administracyjnym (logowanie Administratora).
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">
            8. Zmiany Polityki Prywatności
          </h2>
          <p>
            Administrator może aktualizować niniejszą Politykę Prywatności.
            Aktualna wersja jest zawsze dostępna w Serwisie.
          </p>
        </section>
      </main>
    );
  }
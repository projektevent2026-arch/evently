import { ADMIN_NAME, ADMIN_EMAIL, LEGAL_UPDATED, field } from "@/lib/siteConfig"

export const metadata = {
  title: "Polityka Prywatności — Evently",
}

export default function PolitykaPrywatnosciPage() {
  const adminName = field(ADMIN_NAME, "imię i nazwisko")
  const adminEmail = field(ADMIN_EMAIL, "e-mail")

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-2xl font-bold">
        Polityka Prywatności serwisu Evently
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Ostatnia aktualizacja: {LEGAL_UPDATED}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">1. Administrator danych</h2>
        <p>
          Administratorem danych osobowych jest {adminName}. Kontakt w sprawach
          danych osobowych: {adminEmail}.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">
          2. Jakie dane przetwarzamy i w jakim celu
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Zgłoszenie wydarzenia bez konta:</strong> adres e-mail
            zgłaszającego oraz dane podane w formularzu (m.in. nazwa
            organizatora, dane wydarzenia, plakat lub zdjęcia). Adres e-mail
            wykorzystujemy wyłącznie w celu obsługi zgłoszenia i ewentualnego
            kontaktu w jego sprawie. Dane wydarzenia (opis, nazwa organizatora,
            miejsce) są po moderacji publikowane w Serwisie.
          </li>
          <li>
            <strong>Konto Organizatora:</strong> adres e-mail (służy do
            logowania), hasło (przechowywane w postaci zabezpieczonej, nie
            znamy go), identyfikator konta oraz wydarzenia przypisane do konta.
          </li>
          <li>
            <strong>Profil Organizatora (dane dobrowolne i publiczne):</strong>{" "}
            nazwa organizacji, zdjęcie, opis, miasto oraz linki do strony www,
            Facebooka i Instagrama. Dane te są widoczne dla każdego na stronie
            Organizatora i przy jego wydarzeniach.
          </li>
          <li>
            <strong>Numer telefonu (dobrowolny, niepubliczny):</strong>{" "}
            Organizator może podać go w profilu. Widzi go wyłącznie
            Administrator.
          </li>
          <li>
            <strong>Funkcje wspomagane przez AI:</strong> jeśli skorzystasz z
            odczytu plakatu lub poprawy opisu w formularzu, przesłany obraz
            plakatu lub tekst opisu jest przekazywany do dostawcy usług AI
            (Anthropic, USA) wyłącznie w celu wykonania tej funkcji i zwrócenia
            wyniku. Nie podejmujemy na tej podstawie decyzji wobec osób.
          </li>
          <li>
            <strong>Ochrona przed nadużyciami:</strong> przy funkcjach
            formularza (odczyt plakatu, wyszukiwanie adresu) tymczasowo
            przetwarzamy adres IP w celu ograniczenia liczby zapytań.
          </li>
          <li>
            <strong>Mapy i adresy:</strong> podczas wyświetlania map Twoja
            przeglądarka pobiera kafelki map od dostawcy CARTO (dane map:
            OpenStreetMap), co wiąże się z przekazaniem Twojego adresu IP temu
            dostawcy. Adresy miejsc wydarzeń są zamieniane na współrzędne przy
            użyciu usługi Nominatim (OpenStreetMap).
          </li>
          <li>
            <strong>Dane techniczne:</strong> korzystamy z anonimowych statystyk
            odwiedzin (Vercel Analytics), które nie wykorzystują plików cookie i
            nie identyfikują konkretnych osób. Dla każdego wydarzenia
            zapisujemy też zbiorczy licznik wyświetleń oraz daty pierwszego i
            ostatniego wyświetlenia, bez identyfikowania odwiedzających.
            Dostawcy infrastruktury mogą przetwarzać dane techniczne (np. adres
            IP) niezbędne do działania i bezpieczeństwa usług.
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
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Obsługa zgłoszenia i prowadzenie Konta Organizatora: art. 6 ust. 1
            lit. b RODO (działania na Twoje żądanie).
          </li>
          <li>
            Moderacja, bezpieczeństwo i ochrona przed nadużyciami, statystyki:
            art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes polegający
            na prowadzeniu, moderacji i zabezpieczaniu Serwisu).
          </li>
          <li>
            Dobrowolne dane Profilu i numer telefonu: art. 6 ust. 1 lit. a RODO
            (zgoda wyrażana przez wpisanie danych). Możesz ją wycofać w każdej
            chwili, usuwając dane z profilu lub pisząc na adres z pkt 1;
            wycofanie zgody nie wpływa na zgodność z prawem przetwarzania przed
            jej wycofaniem.
          </li>
          <li>
            Obsługa zgłoszeń nielegalnych treści: art. 6 ust. 1 lit. c RODO
            (obowiązki wynikające z rozporządzenia (UE) 2022/2065).
          </li>
        </ul>
        <p className="mt-2">
          Podanie danych jest dobrowolne, ale adres e-mail jest niezbędny do
          zgłoszenia wydarzenia i założenia Konta.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">4. Odbiorcy danych</h2>
        <p>
          Dane są przechowywane i przetwarzane z wykorzystaniem usług dostawców
          infrastruktury: Supabase (baza danych, logowanie, pliki), Vercel
          (hosting i statystyki) oraz Upstash (ograniczanie liczby zapytań).
          Funkcje wspomagane przez AI obsługuje Anthropic, a mapy i adresy —
          CARTO i OpenStreetMap, w zakresie opisanym w pkt 2. Dostawcy ci mogą
          przetwarzać dane poza Europejskim Obszarem Gospodarczym (m.in. w
          USA), z zastosowaniem odpowiednich zabezpieczeń wymaganych przez RODO.
          Dane Profilu wymienione w pkt 2 jako publiczne są widoczne dla
          każdego.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">5. Okres przechowywania</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Dane Konta i Profilu: do czasu usunięcia Konta (na Twoje żądanie).
          </li>
          <li>
            Dane związane ze zgłoszeniem i wydarzeniem: przez czas niezbędny do
            obsługi zgłoszenia i prezentacji wydarzenia w Serwisie. Usunięte
            wydarzenie trafia do kosza i jest trwale usuwane po 30 dniach.
          </li>
          <li>
            Zgłoszenia nielegalnych treści i decyzje moderacyjne: przez czas
            niezbędny do ich obsługi oraz obrony przed ewentualnymi
            roszczeniami.
          </li>
          <li>Dane IP służące ograniczaniu liczby zapytań: do 1 godziny.</li>
        </ul>
        <p className="mt-2">
          W przypadku danych przetwarzanych na podstawie prawnie uzasadnionego
          interesu — do czasu wniesienia sprzeciwu lub ustania tego interesu.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">6. Twoje prawa</h2>
        <p>
          Przysługuje Ci prawo do: dostępu do swoich danych, ich sprostowania,
          usunięcia, ograniczenia przetwarzania, wniesienia sprzeciwu (wobec
          przetwarzania opartego na prawnie uzasadnionym interesie),
          przenoszenia danych oraz wycofania zgody. Masz również prawo
          wniesienia skargi do organu nadzorczego; w Polsce jest nim Prezes
          Urzędu Ochrony Danych Osobowych (PUODO). W celu realizacji swoich
          praw skontaktuj się pod adresem: {adminEmail}. Nie stosujemy
          profilowania ani zautomatyzowanego podejmowania decyzji wobec osób.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">7. Pliki cookie</h2>
        <p>
          Serwis nie wykorzystuje plików cookie w celach marketingowych ani
          analitycznych. Niezbędny technicznie plik sesji (logowanie) jest
          ustawiany wyłącznie osobom, które się logują, czyli Organizatorom i
          Administratorowi.
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
  )
}
import { ADMIN_NAME, ADMIN_EMAIL, SITE_URL, LEGAL_UPDATED, field } from "@/lib/siteConfig"

export const metadata = {
  title: "Regulamin — Evently",
}

export default function RegulaminPage() {
  const adminName = field(ADMIN_NAME, "imię i nazwisko")
  const adminEmail = field(ADMIN_EMAIL, "e-mail")
  const siteUrl = field(SITE_URL, "adres serwisu")

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-2xl font-bold">Regulamin serwisu Evently</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Ostatnia aktualizacja: {LEGAL_UPDATED}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§1. Postanowienia ogólne</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Niniejszy Regulamin określa zasady korzystania z serwisu
            internetowego Evently, dostępnego pod adresem {siteUrl} (dalej:
            „Serwis”).
          </li>
          <li>
            Właścicielem i administratorem Serwisu jest {adminName}, kontakt:{" "}
            {adminEmail} (dalej: „Administrator”).
          </li>
          <li>
            Serwis jest bezpłatnym katalogiem informującym o wydarzeniach
            lokalnych (m.in. festynach, jarmarkach, wydarzeniach kulturalnych,
            koncertach, wydarzeniach sportowych) w regionie suwalskim.
            Prezentowane wydarzenia mogą mieć wstęp wolny lub płatny. Serwis nie
            sprzedaje biletów i nie pośredniczy w płatnościach.
          </li>
          <li>
            Adres e-mail wskazany w pkt 2 jest punktem kontaktowym w rozumieniu
            art. 11 i 12 rozporządzenia (UE) 2022/2065 (Akt o usługach
            cyfrowych) — zarówno dla organów państw członkowskich, Komisji
            Europejskiej i Europejskiej Rady ds. Usług Cyfrowych, jak i dla
            Użytkowników. Językiem komunikacji jest język polski.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§2. Definicje</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Użytkownik</strong> – każda osoba korzystająca z Serwisu.
          </li>
          <li>
            <strong>Organizator</strong> – osoba lub podmiot zgłaszający albo
            publikujący wydarzenie w Serwisie, z Kontem lub bez.
          </li>
          <li>
            <strong>Konto Organizatora</strong> – konto w Serwisie zakładane na
            zaproszenie Administratora, umożliwiające samodzielne publikowanie
            i edycję wydarzeń.
          </li>
          <li>
            <strong>Profil Organizatora</strong> – dobrowolnie uzupełniane
            informacje o Organizatorze (nazwa, zdjęcie, opis, miasto, linki)
            prezentowane publicznie na stronie Organizatora i przy jego
            wydarzeniach.
          </li>
          <li>
            <strong>Wydarzenie</strong> – wydarzenie lokalne prezentowane w
            Serwisie.
          </li>
          <li>
            <strong>Treści</strong> – wydarzenia, opisy, plakaty, grafiki,
            zdjęcia, dane i linki zamieszczane przez Organizatorów.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">
          §3. Zasady korzystania z Serwisu
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Korzystanie z Serwisu w zakresie przeglądania wydarzeń jest
            bezpłatne i nie wymaga rejestracji.
          </li>
          <li>
            Użytkownik zobowiązuje się do korzystania z Serwisu zgodnie z
            obowiązującym prawem i dobrymi obyczajami.
          </li>
          <li>
            Zabronione jest zamieszczanie treści bezprawnych, wprowadzających w
            błąd, naruszających prawa osób trzecich lub dobra osobiste oraz
            treści niezwiązanych z charakterem Serwisu.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">
          §4. Zgłaszanie i publikacja wydarzeń
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Wydarzenie można zgłosić za pomocą formularza dostępnego w Serwisie,
            bez zakładania konta.
          </li>
          <li>
            Zgłoszenie bez Konta nie jest równoznaczne z publikacją. Każde takie
            zgłoszenie podlega moderacji przed publikacją, a Administrator
            zastrzega sobie prawo do odmowy publikacji, edycji lub usunięcia
            wydarzenia — w szczególności gdy treść jest nieprawdziwa,
            niezgodna z prawem, narusza prawa osób trzecich lub nie odpowiada
            charakterowi Serwisu.
          </li>
          <li>
            Wydarzenia dodawane przez Organizatora posiadającego Konto są
            publikowane natychmiast, bez wcześniejszej moderacji. Nie ogranicza
            to prawa Administratora do ich moderacji po publikacji (ukrycia,
            edycji lub usunięcia) na zasadach opisanych w §7.
          </li>
          <li>
            Zgłaszane wydarzenia powinny być rzeczywiste i dotyczyć obszaru
            objętego Serwisem.
          </li>
          <li>
            Organizator odpowiada za prawdziwość, aktualność i zgodność z
            prawem podanych informacji.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">
          §5. Konto i Profil Organizatora
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Konta Organizatorów zakładane są wyłącznie na zaproszenie
            Administratora.
          </li>
          <li>
            Organizator może uzupełnić Profil: nazwę organizacji, zdjęcie, opis,
            miasto, adres strony www oraz linki do profili na Facebooku i
            Instagramie. Pola te są dobrowolne, a ich zawartość jest publiczna.
            Organizator może je zmienić lub usunąć w każdej chwili. Numer
            telefonu (opcjonalny) oraz adres e-mail konta nie są publiczne.
          </li>
          <li>
            Organizator odpowiada za dane i linki podane w Profilu, w tym za to,
            że prowadzą one do treści zgodnych z prawem i nienaruszających praw
            osób trzecich. Organizator nie powinien podawać w Profilu danych
            osobowych osób trzecich bez ich zgody.
          </li>
          <li>
            Administrator może zawiesić lub usunąć Konto Organizatora, który
            narusza Regulamin lub prawo, na zasadach opisanych w §7.
            Organizator może w każdej chwili zażądać usunięcia swojego Konta,
            pisząc na adres wskazany w §1 pkt 2.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§6. Prawa do treści</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Zgłaszając lub publikując wydarzenie (w tym plakaty, grafiki,
            zdjęcia i opisy), Organizator oświadcza, że posiada prawa do
            przesłanych materiałów lub zgodę na ich wykorzystanie.
          </li>
          <li>
            Organizator udziela Administratorowi niewyłącznej, nieodpłatnej
            licencji na publikację i prezentację przesłanych materiałów w
            Serwisie w celu informowania o wydarzeniu.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">
          §7. Moderacja i zgłaszanie nielegalnych treści
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Każdy może zgłosić treść, którą uważa za nielegalną, wysyłając
            wiadomość na adres wskazany w §1 pkt 2 (w stopce Serwisu znajduje
            się odnośnik „Zgłoś treść”).
          </li>
          <li>
            Zgłoszenie powinno zawierać: (a) uzasadnienie, dlaczego zgłaszający
            uważa treść za nielegalną; (b) dokładne wskazanie treści, np. adres
            strony; (c) imię i nazwisko oraz adres e-mail zgłaszającego; (d)
            oświadczenie, że zgłaszający działa w dobrej wierze, a podane
            informacje są dokładne i kompletne.
          </li>
          <li>
            Administrator potwierdza otrzymanie zgłoszenia, rozpatruje je
            starannie i obiektywnie oraz informuje zgłaszającego o swojej
            decyzji.
          </li>
          <li>
            Administrator może ograniczyć dostęp do treści (ukryć je lub
            usunąć), a w razie powtarzających się naruszeń zawiesić lub usunąć
            Konto Organizatora — zarówno po zgłoszeniu, jak i z własnej
            inicjatywy, gdy treść jest niezgodna z prawem lub Regulaminem.
            Moderacja jest prowadzona ręcznie przez Administratora, bez
            zautomatyzowanego podejmowania decyzji.
          </li>
          <li>
            O decyzji ograniczającej treść lub Konto Administrator informuje
            Organizatora (jeżeli zna jego adres e-mail), podając uzasadnienie i
            podstawę decyzji (przepis prawa albo postanowienie Regulaminu).
            Organizator może zwrócić się o ponowne rozpatrzenie sprawy, pisząc
            na adres wskazany w §1 pkt 2.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§8. Odpowiedzialność</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Serwis ma charakter wyłącznie informacyjny. Administrator nie jest
            organizatorem prezentowanych wydarzeń.
          </li>
          <li>
            Administrator dokłada starań, aby informacje były aktualne i
            rzetelne, jednak nie gwarantuje ich pełnej poprawności ani tego, że
            wydarzenie odbędzie się zgodnie z opisem. Dane (w tym daty, godziny i
            lokalizacje) mają charakter orientacyjny — przed udziałem warto
            potwierdzić je u organizatora.
          </li>
          <li>
            Administrator nie ponosi odpowiedzialności za odwołanie, zmianę lub
            przebieg wydarzeń ani za szkody wynikłe z udziału w nich.
          </li>
          <li>
            Treści zamieszczają Organizatorzy. Administrator nie weryfikuje
            wydarzeń publikowanych z Kont Organizatorów przed ich publikacją i
            nie ponosi odpowiedzialności za treści nielegalne, o których nie
            wiedział. Po uzyskaniu wiarygodnej wiadomości o bezprawnym
            charakterze treści niezwłocznie ogranicza do niej dostęp (art. 6
            rozporządzenia (UE) 2022/2065).
          </li>
          <li>
            Serwis zawiera odnośniki do stron zewnętrznych (m.in. stron
            Organizatorów, Facebooka, Instagrama, sprzedaży biletów).
            Administrator nie odpowiada za ich treść.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§9. Dane osobowe</h2>
        <p>
          Zasady przetwarzania danych osobowych określa{" "}
          <a
            href="/polityka-prywatnosci"
            className="underline underline-offset-2"
          >
            Polityka Prywatności
          </a>{" "}
          dostępna w Serwisie.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§10. Reklamacje i kontakt</h2>
        <p>
          Uwagi, reklamacje oraz zgłoszenia dotyczące treści (np. prośby o
          korektę lub usunięcie wydarzenia) można kierować na adres:{" "}
          {adminEmail}.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">§11. Postanowienia końcowe</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Administrator zastrzega sobie prawo do zmiany Regulaminu. Zmiany
            obowiązują od chwili opublikowania w Serwisie.
          </li>
          <li>
            W sprawach nieuregulowanych niniejszym Regulaminem stosuje się
            przepisy prawa polskiego.
          </li>
        </ol>
      </section>
    </main>
  )
}
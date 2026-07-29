export const metadata = {
    title: "Regulamin — Evently",
  };
  
  export default function RegulaminPage() {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-800 dark:text-zinc-200">
        <h1 className="mb-2 text-2xl font-bold">Regulamin serwisu Evently</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Ostatnia aktualizacja: [UZUPEŁNIJ: data]
        </p>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§1. Postanowienia ogólne</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Niniejszy Regulamin określa zasady korzystania z serwisu
              internetowego Evently, dostępnego pod adresem [UZUPEŁNIJ: adres
              serwisu] (dalej: „Serwis").
            </li>
            <li>
              Właścicielem i administratorem Serwisu jest [UZUPEŁNIJ: imię i
              nazwisko lub nazwa], kontakt: [UZUPEŁNIJ: e-mail] (dalej:
              „Administrator").
            </li>
            <li>
              Serwis jest bezpłatnym katalogiem informującym o bezpłatnych,
              lokalnych wydarzeniach (m.in. festynach, jarmarkach, wydarzeniach
              kulturalnych, koncertach, wydarzeniach sportowych) w regionie
              suwalskim.
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
              <strong>Organizator</strong> – osoba lub podmiot zgłaszający
              wydarzenie do publikacji w Serwisie.
            </li>
            <li>
              <strong>Wydarzenie</strong> – bezpłatne wydarzenie lokalne
              prezentowane w Serwisie.
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
          </ol>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§4. Zgłaszanie wydarzeń</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Organizator może zgłosić wydarzenie za pomocą formularza dostępnego
              w Serwisie.
            </li>
            <li>
              Zgłaszane wydarzenia powinny być bezpłatne, rzeczywiste i dotyczyć
              obszaru objętego Serwisem.
            </li>
            <li>
              Zgłoszenie nie jest równoznaczne z publikacją. Każde zgłoszenie
              podlega moderacji, a Administrator zastrzega sobie prawo do odmowy
              publikacji, edycji lub usunięcia wydarzenia — w szczególności gdy
              treść jest nieprawdziwa, niezgodna z prawem, narusza prawa osób
              trzecich lub nie odpowiada charakterowi Serwisu.
            </li>
            <li>
              Organizator odpowiada za prawdziwość i aktualność podanych
              informacji.
            </li>
          </ol>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§5. Prawa do treści</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Zgłaszając wydarzenie (w tym plakaty, grafiki, zdjęcia i opisy),
              Organizator oświadcza, że posiada prawa do przesłanych materiałów lub
              zgodę na ich wykorzystanie.
            </li>
            <li>
              Organizator udziela Administratorowi niewyłącznej, nieodpłatnej
              licencji na publikację i prezentację przesłanych materiałów w
              Serwisie w celu informowania o wydarzeniu.
            </li>
          </ol>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§6. Odpowiedzialność</h2>
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
          </ol>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§7. Dane osobowe</h2>
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
          <h2 className="mb-2 text-lg font-semibold">§8. Reklamacje i kontakt</h2>
          <p>
            Uwagi, reklamacje oraz zgłoszenia dotyczące treści (np. prośby o
            korektę lub usunięcie wydarzenia) można kierować na adres: [UZUPEŁNIJ:
            e-mail].
          </p>
        </section>
  
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">§9. Postanowienia końcowe</h2>
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
    );
  }
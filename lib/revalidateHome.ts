// Wywołuje /api/revalidate po każdej zmianie, która wpływa na to, co widać
// na stronie głównej (nowe wydarzenie opublikowane od razu, edycja,
// zatwierdzenie, usunięcie, przywrócenie z kosza) — strona główna jest
// cache'owana (revalidate: 60 w app/page.tsx), więc bez tego świeża zmiana
// mogła być niewidoczna nawet do minuty. Wydzielone jako jedna funkcja,
// bo jest wywoływana z kilku miejsc (formularz publiczny, panel admina,
// /moje-wydarzenia) — ten sam wzorzec powielenia, który już kilka razy
// dziś wieczorem naprawialiśmy gdzie indziej w tej apce.
//
// Fire-and-forget: błąd tego wywołania nigdy nie powinien przerwać ani
// spowolnić głównej operacji (zapisu wydarzenia) — w najgorszym razie
// strona i tak odświeży się sama w ciągu 60 sekund.
export function revalidateHome() {
    fetch('/api/revalidate', { method: 'POST' }).catch(() => {})
  }
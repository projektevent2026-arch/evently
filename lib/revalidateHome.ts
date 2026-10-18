// Wywołuje /api/revalidate po każdej zmianie, która wpływa na to, co widać
// na stronie głównej (nowe wydarzenie opublikowane od razu, edycja,
// zatwierdzenie, usunięcie, przywrócenie z kosza) — strona główna jest
// cache'owana (revalidate: 60 w app/page.tsx), więc bez tego świeża zmiana
// mogła być niewidoczna nawet do minuty. Wydzielone jako jedna funkcja,
// bo jest wywoływana z kilku miejsc (formularz publiczny, panel admina,
// /moje-wydarzenia) — ten sam wzorzec powielenia, który już kilka razy
// dziś wieczorem naprawialiśmy gdzie indziej w tej apce.
//
// Błąd tego wywołania nigdy nie przerywa głównej operacji (zapisu wydarzenia):
// w najgorszym razie strona i tak odświeży się sama w ciągu 60 sekund.
//
// 2026-10-08: funkcja ZWRACA obietnicę (rozwiązuje się zawsze, nigdy nie rzuca
// błędu) i ma 3-sekundowy limit. Dotychczasowe wywołania bez await działają
// jak wcześniej (fire-and-forget). Miejsca, po których użytkownik od razu
// przechodzi na stronę główną (formularz dodawania/edycji wydarzenia), robią
// teraz `await revalidateHome()`, żeby odświeżanie zdążyło się wykonać
// PRZED przejściem — inaczej strona główna mogła pokazać stan sprzed zapisu.
export function revalidateHome(): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  return fetch('/api/revalidate', { method: 'POST', signal: controller.signal })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => clearTimeout(timer))
}
import { NextRequest, NextResponse } from 'next/server'

// ── Walidacja daty po skanie (pas bezpieczeństwa) ──────────────────────────
// Nawet z datą w promcie AI potrafi zwrócić rok z przeszłości, gdy plakat nie
// podaje roku. Jeśli start_date wyszedł przed dzisiaj, a plakat pewnie miał na
// myśli najbliższą przyszłość, podbijamy rok (o 1, w razie potrzeby o 2).
function fixPastDate(dateStr: string | null): string | null {
  if (!dateStr) return dateStr
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!m) return dateStr

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let year = parseInt(m[1], 10)
  const monthDay = `${m[2]}-${m[3]}`

  // maks. 2 podbicia (np. 29 lutego -> szukamy najbliższego sensownego roku)
  for (let i = 0; i < 3; i++) {
    const candidate = new Date(`${year}-${monthDay}T12:00:00`)
    if (!isNaN(candidate.getTime()) && candidate >= today) {
      return `${year}-${monthDay}`
    }
    year += 1
  }
  return `${year}-${monthDay}`
}
// Wylicza start_date/end_date (dla reszty apki, która jeszcze ich używa)
// z tablicy dates zwróconej przez AI. Pierwszy/ostatni po posortowaniu.
function deriveStartEnd(dates: any[]): { start_date: string | null; start_time: string | null; end_date: string | null; end_time: string | null } {
  const valid = (dates || []).filter(d => d && d.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  if (valid.length === 0) return { start_date: null, start_time: null, end_date: null, end_time: null }
  const first = valid[0]
  const last = valid[valid.length - 1]
  return {
    start_date: first.date,
    start_time: first.start_time || null,
    end_date: valid.length > 1 ? last.date : null,
    end_time: valid.length > 1 ? (last.end_time || null) : (first.end_time || null),
  }
}

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType } = await req.json()

  // Dzisiejsza data wstrzykiwana do promptu, żeby AI nie zgadywało roku.
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10) // YYYY-MM-DD
  const currentYear = today.getFullYear()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Dzisiejsza data to ${todayISO} (rok ${currentYear}).

Przeanalizuj ten plakat wydarzenia i wyciągnij informacje. Odpowiedz TYLKO w formacie JSON bez żadnego tekstu przed ani po:
{
  "title": "nazwa wydarzenia",
  "city": "miasto, wieś lub gmina",
  "venue_name": "nazwa konkretnego miejsca lub null",
  "address": "ulica z numerem lub null",
  "dates": [
    { "date": "YYYY-MM-DD", "start_time": "HH:MM lub null", "end_time": "HH:MM lub null" }
  ],
  "description": "opis wydarzenia",
  "organizer_name": "organizator lub null",
  "category": "jedna z: festyny, kultura, muzyka, sport",
  "is_free": true lub false,
  "price_from": liczba lub null,
  "schedule": [
    { "time": "HH:MM lub null", "title": "nazwa punktu programu", "description": "opcjonalny opis", "day": 1 }
  ]
}

═══ MIASTO vs NAZWA MIEJSCA — częsty błąd ═══
To są DWA RÓŻNE pola, nie wpisuj tego samego w oba:
- "city" = miejscowość na mapie Polski: Suwałki, Radziłów, Filipów, Przerośl.
- "venue_name" = nazwa konkretnego obiektu: "Zalew Arkadia", "Targowisko Wiejskie", "Park Konstytucji 3 Maja", "Dom Kultury", "Amfiteatr".
- "address" = TYLKO ulica z numerem, np. "Chłodna 2". Jeśli plakat nie podaje ulicy, wpisz null — NIE powtarzaj tam nazwy miejsca.
Przykład: plakat "Zalew Arkadia, Suwałki" -> city: "Suwałki", venue_name: "Zalew Arkadia", address: null.
Jeśli plakat podaje tylko nazwę obiektu bez miejscowości, ustal miejscowość z kontekstu (np. z logotypu gminy w stopce).

═══ ORGANIZATOR — szukaj w STOPCE ═══
Organizator prawie nigdy nie jest napisany na środku plakatu. Jest NA DOLE, często jako:
- pasek z logotypami (herb gminy, logo domu kultury, logo sponsora),
- napis małą czcionką "Organizator:", "Zapraszają:", "Patronat:".
Przeczytaj DOKŁADNIE dolną część plakatu, także drobny druk.
Wpisz nazwę głównego organizatora, np. "Gmina Radziłów", "Suwalski Ośrodek Kultury".
Jeśli w stopce jest kilka podmiotów, wybierz ten najbardziej wyeksponowany (największy herb/logo).

═══ PROGRAM — wypełnij CAŁY, punkty BEZ godzin też ═══
- Przepisz WSZYSTKIE punkty programu z plakatu, od pierwszego do ostatniego. Nie zatrzymuj się po kilku.
- Bardzo dużo festynów ma program BEZ godzin — samą listę atrakcji ("dmuchańce", "wata cukrowa", "malowanie twarzy", "pokaz baniek"). TAKIE PUNKTY TEŻ MUSZĄ TRAFIĆ DO "schedule", z "time": null.
- NIE POMIJAJ punktu tylko dlatego, że nie ma przy nim godziny. Ustaw "time": null i zachowaj punkt.
- Jeśli plakat ma sekcję typu "ATRAKCJE DLA KAŻDEGO" albo listę z ikonkami — każda pozycja z tej listy to osobny punkt programu z "time": null.
- Każdy punkt z godziną ma DOKŁADNIE JEDNĄ godzinę (zwykle napisaną przed nim).
- Jeśli tytuł punktu zawija się na dwie linie (np. "16:45 – Szkoła dziecięca\\npod opieką Pani X"), to JEDEN punkt, nie dwa. Połącz w jeden "title".
- NIGDY nie zwracaj "00:00" jako zgadywanej godziny. "00:00" tylko jeśli plakat dosłownie pokazuje punkt o północy.

═══ TERMINY — znajdź WSZYSTKIE daty na plakacie ═══
- Pole "dates" to LISTA wszystkich terminów wydarzenia. Wpisz KAŻDĄ datę, którą widzisz na plakacie — jedną, dwie, albo osiem.
- Jeśli wydarzenie ma JEDEN dzień: "dates" ma jeden wpis.
- Jeśli plakat pokazuje KOLEJNE dni pod rząd (np. "25 LIPCA 2026" i niżej "26 LIPCA 2026") — to wydarzenie WIELODNIOWE, ciągłe. Wpisz każdy dzień jako osobny wpis w "dates", z jego własną godziną. Program drugiego dnia jest zwykle NIŻEJ na plakacie, pod osobnym nagłówkiem z datą — przewiń do samego dołu i przepisz TAKŻE ten program. Punktom pierwszego dnia nadaj "day": 1, punktom drugiego "day": 2, itd.
- Jeśli plakat pokazuje ROZRZUCONE daty z przerwami (np. lista "5 LIPCA / 12 LIPCA / 19 LIPCA / 26 LIPCA" — cykliczne, np. cotygodniowe spotkania, warsztaty, targi) — to wydarzenie CYKLICZNE. Wpisz KAŻDĄ z tych dat jako osobny wpis w "dates". Program (schedule) zwykle jest ten sam dla każdego terminu — wpisz go RAZ, wszystkie punkty z "day": 1, nie próbuj dublować programu dla każdej daty.
- Nie kończ pracy po pierwszej dacie — sprawdź plakat od góry do dołu, licząc WSZYSTKIE wystąpienia dat, nie tylko pierwszą.
- Każdy wpis w "dates" może mieć inną godzinę "start_time"/"end_time", jeśli plakat tak podaje (np. sobota od 11:00, niedziela od 14:00). Jeśli plakat podaje jedną godzinę dla wszystkich dat, powtórz ją w każdym wpisie.

═══ OPIS — napisz od razu dobry, gotowy do publikacji ═══
- 2-4 pełne zdania, płynną polszczyzną, w trzeciej osobie.
- Napisz CO to za wydarzenie, DLA KOGO jest i CO konkretnie czeka na uczestników.
- Wymień najciekawsze atrakcje z plakatu (gwiazda wieczoru, konkursy, atrakcje dla dzieci, jedzenie).
- Jeśli jest gwiazda/główny wykonawca, wymień z nazwy — ludzie tego szukają.
- Nie pisz "wydarzenie odbędzie się dnia..." — data i miejsce są w osobnych polach, nie powtarzaj ich.
- Nie używaj marketingowego bełkotu ani wykrzykników.

═══ POLSKA ORTOGRAFIA — czytaj uważnie ═══
Plakaty często mają ozdobne, stylizowane czcionki, w których łatwo pomylić litery. Zanim zwrócisz tekst, sprawdź, czy każde słowo jest poprawnym polskim wyrazem:
- "Kiermasz" (nie "Kiermaż"), "jadła" (nie "jadia"), "Sąsiedzi" (nie "Zasiedzi").
- Uważaj na pary: rz/ż, ch/h, u/ó, ą/a, ę/e, ł/l, ś/s, ź/ż.
- Jeśli odczytane słowo nie istnieje w języku polskim, to znaczy że źle odczytałeś literę — popraw na najbliższy sensowny wyraz.
- Zachowaj oryginalną pisownię nazw własnych i wielkich liter (np. "PRZEROŚLIAKI", "INESS").

═══ ROK WYDARZENIA ═══
- Wydarzenia z plakatów są ZAWSZE w przyszłości lub dziś, NIGDY w przeszłości.
- Jeśli plakat podaje rok, użyj go.
- Jeśli plakat NIE podaje roku (np. tylko "25 lipca"), wybierz NAJBLIŻSZĄ PRZYSZŁĄ datę względem ${todayISO}. Zwykle rok ${currentYear} lub ${currentYear + 1}.
- start_date NIGDY nie może być wcześniejsze niż ${todayISO}.

Jeśli na plakacie nie ma żadnego programu ani listy atrakcji, zwróć "schedule": [].`,
            },
          ],
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Anthropic API error:', JSON.stringify(data))
    return NextResponse.json({ error: data.error?.message || 'API error' }, { status: 400 })
  }

  const text = data.content?.[0]?.text || '{}'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Pas bezpieczeństwa: podbij rok każdej daty, jeśli AI mimo wszystko
    // zwróciło przeszłość (może się zdarzyć osobno dla każdego wpisu).
    if (Array.isArray(parsed.dates)) {
      parsed.dates = parsed.dates
        .filter((d: any) => d && d.date)
        .map((d: any) => ({ ...d, date: fixPastDate(d.date) }))
    } else {
      parsed.dates = []
    }

    // Wyliczamy start_date/end_date dla wstecznej zgodności — reszta
    // formularza (podgląd, itd.) może jeszcze na nie liczyć, dopóki
    // wszystkie miejsca nie przejdą w pełni na tablicę dates.
    const derived = deriveStartEnd(parsed.dates)
    parsed.start_date = derived.start_date
    parsed.start_time = derived.start_time
    parsed.end_date = derived.end_date
    parsed.end_time = derived.end_time

    return NextResponse.json(parsed)
  } catch {
    console.error('JSON parse error:', text)
    return NextResponse.json({ error: 'Nie udało się przeanalizować plakatu' }, { status: 400 })
  }
}
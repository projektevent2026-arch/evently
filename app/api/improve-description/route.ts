import { NextRequest, NextResponse } from 'next/server'

const CONCISE_RULES = `- 2-4 zdania, płynną polszczyzną, w trzeciej osobie — zwarta proza, NIE lista punktów ani osobne sekcje.
- Możesz użyć 1, maksymalnie 2 dobrze dobranych emoji, tylko jeśli naturalnie pasują do treści (np. przy nazwie muzyki/tańca/rodzaju wydarzenia) — nie przy każdym zdaniu, nie jako czysta ozdoba. Jeśli nie masz dobrego pomysłu na emoji, nie dodawaj żadnego — lepiej zero niż wciśnięte na siłę.`

const RICH_RULES = `- Podziel opis na kilka krótkich, żywych linijek z pasującymi emoji (np. przy typie wydarzenia, atrakcjach, wykonawcach) — stylistyka zbliżona do ogłoszenia wydarzenia na Facebooku, NIE zwykła proza w jednym akapicie.
- Skup się WYŁĄCZNIE na treści: co się będzie działo, kto występuje, jakie atrakcje. NIE pisz osobnych linijek/sekcji z datą, godziną, lokalizacją ani ceną — te informacje są w osobnych polach formularza i tak się wyświetlą, więc powtarzanie ich w opisie tworzy duplikat.
- Krótkie, żywe linijki (każda zaczyna się od nowej linii), entuzjastyczny ton, jeden emoji na linijkę maksymalnie — ale bez zmyślania faktów.

Przykład formatu (naśladuj STRUKTURĘ i długość, NIE treść — Twój opis musi dotyczyć wydarzenia z tekstu organizatora poniżej, nie tego przykładu):

Przykładowe wejście: "koncert zespolu Wiatraki w sobote na rynku poczatek 18 impreza dla calej rodziny bedzie tez food trucki i stoiska z rekodzielem wstep bezplatny"

Przykładowe wyjście:
🎶 KONCERT ZESPOŁU WIATRAKI NA RYNKU!
Szykuje się muzyczny wieczór dla całej rodziny! 🎉
🎤 Na scenie: Zespół Wiatraki
🍔 Do tego: food trucki z pyszną kuchnią
🧶 Oraz: stoiska z lokalnym rękodziełem
Zapraszamy całe rodziny! 🙌`

export async function POST(req: NextRequest) {
  const { text, style } = await req.json()

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Brak tekstu do poprawienia' }, { status: 400 })
  }

  const styleRules = style === 'rich' ? RICH_RULES : CONCISE_RULES

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Jesteś redaktorem opisów lokalnych wydarzeń (festyny, koncerty, jarmarki) dla portalu Evently. Organizator wpisał poniżej surowy, często niedopracowany tekst o swoim wydarzeniu. Popraw go i zwróć WYŁĄCZNIE gotowy, dopracowany opis — bez żadnego wstępu, komentarza, cudzysłowów ani tekstu przed/po.

Zasady:
- Popraw styl, gramatykę i interpunkcję, zachowując WSZYSTKIE fakty podane przez organizatora — nic nie dodawaj od siebie (żadnych wymyślonych atrakcji, godzin, nazwisk, gwiazd wieczoru, których nie ma w oryginale).
${styleRules}
- Nie pisz "wydarzenie odbędzie się dnia..." ani nie podawaj godziny rozpoczęcia w treści opisu — data, godzina i miejsce są w osobnych polach formularza, nie powtarzaj ich.
- Nie używaj marketingowego bełkotu ani nadmiaru wykrzykników.
- Jeśli oryginalny tekst jest bardzo krótki albo chaotyczny (np. luźna lista słów kluczowych), rozwiń go w spójny opis, trzymając się wyłącznie podanych faktów — nie zmyślaj brakujących szczegółów.
- Popraw literówki i błędy ortograficzne (rz/ż, ch/h, u/ó, ą/a, ę/e).
- Zwróć szczególną uwagę na POPRAWNĄ ODMIANĘ polskich słów (przypadki, rodzaje, liczby) — np. "pchli targ" w dopełniaczu to "pchlego targu", NIE "pchiego targu". Jeśli nie masz pewności co do poprawnej formy jakiegoś słowa, przeformułuj zdanie tak, żeby tego uniknąć, zamiast zgadywać odmianę.

Surowy tekst od organizatora:
"""
${text}
"""`,
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

  const improved = data.content?.[0]?.text || ''

  if (!improved.trim()) {
    return NextResponse.json({ error: 'Nie udało się poprawić opisu' }, { status: 400 })
  }

  return NextResponse.json({ description: improved.trim() })
}
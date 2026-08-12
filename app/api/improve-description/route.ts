import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Brak tekstu do poprawienia' }, { status: 400 })
  }

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
- 2-4 zdania, płynną polszczyzną, w trzeciej osobie.
- Nie pisz "wydarzenie odbędzie się dnia..." — data i miejsce są w osobnych polach formularza, nie powtarzaj ich w treści opisu.
- Nie używaj marketingowego bełkotu ani nadmiaru wykrzykników.
- Jeśli oryginalny tekst jest bardzo krótki albo chaotyczny (np. luźna lista słów kluczowych), rozwiń go w spójny opis, trzymając się wyłącznie podanych faktów — nie zmyślaj brakujących szczegółów.
- Popraw literówki i błędy ortograficzne (rz/ż, ch/h, u/ó, ą/a, ę/e).

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
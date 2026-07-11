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
      max_tokens: 2048,
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
  "city": "miasto",
  "address": "adres lub miejsce",
  "venue_name": "nazwa miejsca",
  "start_date": "YYYY-MM-DD lub null",
  "start_time": "HH:MM lub null",
  "end_date": "YYYY-MM-DD lub null",
  "end_time": "HH:MM lub null",
  "description": "krótki opis",
  "organizer_name": "organizator lub null",
  "category": "jedna z: culture, music, food, sport, family, technology",
  "is_free": true lub false,
  "price_from": liczba lub null,
  "schedule": [
    { "time": "HH:MM", "title": "nazwa punktu programu", "description": "opcjonalny opis" }
  ]
}

WAŻNE — rok wydarzenia:
- Wydarzenia z plakatów są ZAWSZE w przyszłości lub dziś, NIGDY w przeszłości.
- Jeśli plakat podaje rok, użyj go.
- Jeśli plakat NIE podaje roku (np. tylko "25 lipca"), wybierz NAJBLIŻSZĄ PRZYSZŁĄ datę względem ${todayISO}. Zwykle będzie to rok ${currentYear} lub ${currentYear + 1}.
- start_date NIGDY nie może być wcześniejsze niż ${todayISO}.

Jeśli na plakacie nie ma harmonogramu, zwróć "schedule": [].
Jeśli wydarzenie trwa kilka dni, podziel harmonogram według dni i zwróć osobną tablicę dla każdego dnia w formacie:
"schedule": [
  { "time": "HH:MM", "title": "nazwa punktu", "description": "opcjonalny opis", "day": 1 },
  { "time": "HH:MM", "title": "nazwa punktu", "description": "opcjonalny opis", "day": 2 }
]
gdzie "day" to numer dnia (1, 2, 3...). Jeśli impreza trwa 1 dzień, wszystkie punkty mają "day": 1.

WAŻNE — harmonogram, częsty błąd do uniknięcia:
- Każdy punkt programu na plakacie ma DOKŁADNIE JEDNĄ godzinę przypisaną (zwykle napisaną przed lub przy nim).
- Jeśli tytuł punktu programu zawija się na dwie linie (np. "16:45 – Szkoła dziecięca\\npod opieką Pani X"), to jest to JEDEN punkt programu, nie dwa. Połącz tekst w jeden "title", nie twórz drugiego wpisu w schedule dla kontynuacji linii.
- NIGDY nie zwracaj "00:00" jako zgadywanej/domyślnej godziny. "00:00" zwracaj tylko jeśli plakat dosłownie pokazuje punkt programu o północy.
- Jeśli naprawdę nie możesz ustalić godziny konkretnego punktu (np. plakat jej nie pokazuje), pomiń ten punkt — nie dodawaj go do schedule z wymyśloną godziną.`,
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

    // Pas bezpieczeństwa: podbij rok, jeśli AI mimo wszystko zwróciło przeszłość.
    if (parsed.start_date) parsed.start_date = fixPastDate(parsed.start_date)
    if (parsed.end_date) parsed.end_date = fixPastDate(parsed.end_date)

    return NextResponse.json(parsed)
  } catch {
    console.error('JSON parse error:', text)
    return NextResponse.json({ error: 'Nie udało się przeanalizować plakatu' }, { status: 400 })
  }
}
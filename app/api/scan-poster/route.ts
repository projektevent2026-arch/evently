import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType } = await req.json()

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
              text: `Przeanalizuj ten plakat wydarzenia i wyciągnij informacje. Odpowiedz TYLKO w formacie JSON bez żadnego tekstu przed ani po:
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
    return NextResponse.json(parsed)
  } catch {
    console.error('JSON parse error:', text)
    return NextResponse.json({ error: 'Nie udało się przeanalizować plakatu' }, { status: 400 })
  }
}
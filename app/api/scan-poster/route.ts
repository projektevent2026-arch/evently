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
Jeśli wydarzenie trwa kilka dni, umieść wszystkie punkty programu w jednej liście bez dodawania daty do tytułu punktu.`,
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
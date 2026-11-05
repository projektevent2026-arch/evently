import "server-only"
import { createHmac } from "node:crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ============================================================
// Rate limiting per IP dla endpointów, które isAllowedOrigin sam w
// sobie nie chroni wystarczająco (Origin/Referer da się podrobić w
// zapytaniu spoza przeglądarki). Liczy w Redisie (Upstash), nie w
// pamięci procesu — licznik w pamięci resetowałby się przy każdym
// cold-starcie funkcji serverless na Vercelu i nie liczyłby nic.
//
// Dwa osobne limity:
// - aiRateLimit: /api/scan-poster i /api/improve-description — każde
//   wywołanie kosztuje realne pieniądze (Anthropic API), limit
//   ciasny.
// - geocodeRateLimit: /api/geocode i /api/scan-poster/geocode — nic
//   nie kosztują, ale przy nadużyciu ryzykują banem od Nominatim dla
//   całej apki (jeden shared rate limit na cały serwis), więc limit
//   luźniejszy, ale jest.
//
// 2026-11-04: dwa limity wgrywania zdjęć (/api/upload-url):
// - uploadAnonLimit: bez konta, po SKRÓCIE adresu IP (hashKey), nie po
//   surowym IP (RODO: mniej danych osobowych w Redisie).
// - uploadUserLimit: zalogowany, po identyfikatorze konta (IP w ogóle
//   nie jest potrzebne).
//
// Wymaga darmowego konta na upstash.com (Redis), dwóch zmiennych w
// .env.local i na Vercelu:
//   UPSTASH_REDIS_REST_URL=...
//   UPSTASH_REDIS_REST_TOKEN=...
// oraz pakietów: npm install @upstash/ratelimit @upstash/redis
// Opcjonalnie RATE_LIMIT_SALT (dowolny długi losowy ciąg) — klucz do
// skrótu IP. Bez niego używany jest SUPABASE_SERVICE_ROLE_KEY (też tajny,
// nigdy nie opuszcza serwera).
// ============================================================

const redis = Redis.fromEnv()

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 h"),
  prefix: "ratelimit:ai",
})

export const geocodeRateLimit = new Ratelimit({
  redis,
  // 2026-09-23: 30 -> 60/h. Realny limit Nominatim to ~1 zapytanie/s
  // (3600/h) — nawet 60/h na jeden adres IP to wciąż duży margines
  // bezpieczeństwa, nie ryzykowna zmiana. Podniesione po tym, jak
  // intensywne testowanie jednego przypadku (wielokrotne kliknięcia
  // "Znajdź" pod rząd przy debugowaniu) wyczerpało poprzedni limit.
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "ratelimit:geocode",
})

// Wgrywanie zdjęć bez konta. 20/h na adres: operatorzy komórkowi dzielą
// jeden adres IP między wielu użytkowników, więc zbyt ciasny limit
// blokowałby uczciwych. Zwykła osoba wgrywa 1 do 3 plików.
export const uploadAnonLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "ratelimit:upload-anon",
})

// Wgrywanie zdjęć przez zalogowanego organizatora. Jedno wydarzenie to
// maks. 8 plików (okładka, plakat, 6 zdjęć w galerii), więc 200 na dobę
// wystarcza na ok. 25 wydarzeń z pełną galerią dodanych jednego dnia.
export const uploadUserLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 d"),
  prefix: "ratelimit:upload-user",
})

/** Adres IP wywołującego, z nagłówków, które Vercel realnie ustawia. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

/**
 * Skrót (HMAC-SHA256) wartości, np. adresu IP, do użycia jako klucz w
 * limiterze zamiast surowego adresu. To pseudonimizacja, nie anonimizacja,
 * ale z Redisa nie da się odczytać adresu bez klucza.
 */
export function hashKey(value: string): string {
  const secret = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "evently"
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32)
}
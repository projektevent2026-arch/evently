import "server-only"
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
// Wymaga darmowego konta na upstash.com (Redis), dwóch zmiennych w
// .env.local i na Vercelu:
//   UPSTASH_REDIS_REST_URL=...
//   UPSTASH_REDIS_REST_TOKEN=...
// oraz pakietów: npm install @upstash/ratelimit @upstash/redis
// ============================================================

const redis = Redis.fromEnv()

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 h"),
  prefix: "ratelimit:ai",
})

export const geocodeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "ratelimit:geocode",
})

/** Adres IP wywołującego, z nagłówków, które Vercel realnie ustawia. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}
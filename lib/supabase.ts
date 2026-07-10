import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient (z @supabase/ssr) trzyma sesję w COOKIES,
// dzięki czemu middleware (createServerClient) ją widzi -> koniec "zaloguj się znów".
//
// Uwaga: NIE ma tu już wrappera global.fetch. Poprzedni "(url, options) => fetch(url, options)"
// był no-opem (robił dokładnie to samo co domyślny fetch) i nie dawał żadnej ochrony
// przed zawieszaniem. Ochrona (timeout + retry + abort) siedzi teraz w warstwie zapytań,
// np. fetchEventsWithRetry() w MobileHome.tsx.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient (z @supabase/ssr) trzyma sesję w COOKIES,
// dzięki czemu middleware (createServerClient) ją widzi -> koniec "zaloguj się znów".
// global.fetch zostaje -> Twój fix na zawieszanie fetcha w Edge dalej działa.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options) => fetch(url, options),
    },
  }
)
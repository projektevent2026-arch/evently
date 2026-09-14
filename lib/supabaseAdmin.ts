import "server-only"
import { createClient } from "@supabase/supabase-js"

// ============================================================
// SERVER ONLY — NIGDY nie importuj tego pliku w komponencie
// klienckim ("use client") ani w niczym pod components/.
//
// Ten klucz (SUPABASE_SERVICE_ROLE_KEY, bez prefiksu NEXT_PUBLIC_)
// OMIJA RLS CAŁKOWICIE — widzi i może zmienić każdy wiersz w każdej
// tabeli, niezależnie od tego kto pyta. To nie jest "mocniejsza
// wersja" zwykłego klienta z lib/supabase.ts — to zupełnie inne
// narzędzie, z zerową ochroną poza tym, co sam dopiszesz w kodzie.
//
// import "server-only" na górze wymusza BŁĄD BUDOWANIA, jeśli ktoś
// kiedyś (nawet przypadkiem, np. przez auto-import w edytorze)
// zaimportuje ten plik w kodzie, który trafia do przeglądarki.
// To jest ten sam mechanizm, o którym mówił GPT — nie polegamy na
// tym, że "na pewno będziemy pamiętać", tylko na czymś, co fizycznie
// nie pozwoli tego złamać po cichu.
// ============================================================
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
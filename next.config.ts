import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 2026-09-20: hostname:"**" pozwalał next/image pobierać i przetwarzać
    // obrazek Z DOWOLNEJ strony internetu na żądanie kogokolwiek (nie tylko
    // z Twojego formularza) — otwarte proxy do cudzych obrazków, cudzym
    // kosztem transferu, Twoim kosztem limitu na Vercelu. Pole "Wklej link"
    // w publicznym formularzu jest już ukryte dla niezalogowanych (patrz
    // dodaj-wydarzenie/page.tsx) — ta lista to druga warstwa, dla
    // organizatora, który świadomie z tego korzysta. Dopisz kolejną domenę
    // tu, kiedy zaczniesz brać plakaty z nowego źródła.
    remotePatterns: [
      { protocol: "https", hostname: "nurenprqpecusrvmciit.supabase.co" },
      { protocol: "https", hostname: "soksuwalki.eu" },
      { protocol: "https", hostname: "*.soksuwalki.eu" },
      { protocol: "https", hostname: "kupbilecik.pl" },
      { protocol: "https", hostname: "*.kupbilecik.pl" },
    ],
  },
};

export default nextConfig;
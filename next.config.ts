import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Szeroki wildcard zamiast tylko Supabase — formularze admina i
    // /dodaj-wydarzenie mają pole "lub wklej URL", więc zdjęcia mogą
    // legalnie pochodzić z DOWOLNEGO hosta, nie tylko z Supabase Storage.
    // Ograniczenie tylko do Supabase (poprzednia wersja) po cichu psuło
    // wyświetlanie zdjęć dla każdego wydarzenia z zewnętrznym linkiem —
    // Next.js twardo odrzuca optymalizację obrazu z hosta spoza listy.
    //
    // Świadomy kompromis: to wyłącza ochronę "tylko zaufane domeny", którą
    // remotePatterns miał zapewniać. W tym przypadku (publiczne zdjęcia
    // wydarzeń, nie dane wrażliwe) to akceptowalne — ale gdyby kiedyś
    // pojawiły się nadużycia (ktoś masowo wkleja linki do bardzo dużych
    // plików, żeby zawyżyć zużycie optymalizacji obrazów na Vercel), warto
    // wrócić do węższej listy albo dodać walidację URL przy zapisie.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
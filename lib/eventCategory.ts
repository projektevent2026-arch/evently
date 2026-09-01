// lib/eventCategory.ts
//
// Współdzielone kategorie wydarzeń: normalizacja wartości z bazy do jednego
// z 4 kanonicznych kluczy, oraz mapowania na etykiety PL i kolory. Wcześniej
// normalizeCategory() + słowniki etykiet/kolorów były reimplementowane
// niezależnie w EventMap.tsx, MobileHome.tsx, /ulubione, event-card.tsx i
// events-grid.tsx — ten sam mechanizm duplikacji, który wcześniej naprawiono
// dla logiki dat (lib/eventFormat.tsx).
//
// Podczas konsolidacji znalezione i naprawione dwa realne błędy:
// 1. events-grid.tsx: normalizeCategory kończyła się `return c` zamiast
//    `return 'festyny'` dla nierozpoznanej wartości — inaczej niż reszta
//    apki, która zawsze pada na 'festyny' jako kategorię domyślną.
// 2. EventMap.tsx: filtr kategorii na /mapa porównywał SUROWE
//    `ev.category` (np. 'culture', 'Kultura') wprost z kanonicznym kluczem
//    przycisku filtra ('kultura') — bez normalizacji, więc wydarzenia z
//    kategorią zapisaną w innym formacie niż dokładnie 'kultura' nie
//    pojawiały się przy aktywnym filtrze, mimo że powinny.
//
// CELOWO NIE dotyczy formularzy admina (AdminWydarzenie.tsx,
// app/dodaj-wydarzenie/page.tsx) — ich normalizeCategory ma inną,
// świadomą semantykę: zwraca "" dla pustej wartości (żeby <select>
// pokazał "Wybierz kategorię..." zamiast domyślnie wybierać "festyny"),
// bo tam trzeba odróżnić "nie wybrano" od "wybrano festyny". Mieszanie
// tego z logiką wyświetlania złamałoby wymagane pole formularza.

export type CategoryKey = "festyny" | "kultura" | "muzyka" | "sport"

export function normalizeCategory(raw: string | null | undefined): CategoryKey {
  const c = (raw ?? "").toLowerCase().trim()
  if (c === "kultura" || c === "culture") return "kultura"
  if (c === "muzyka" || c === "music") return "muzyka"
  if (c === "sport") return "sport"
  return "festyny"
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  festyny: "Festyny",
  kultura: "Kultura",
  muzyka: "Muzyka",
  sport: "Sport",
}

// Klasy Tailwind dla plakietek na kartach (MobileHome, /ulubione, event-card).
export const CATEGORY_BADGE_CLASSES: Record<CategoryKey, string> = {
  festyny: "bg-amber-500 text-black",
  kultura: "bg-purple-500 text-white",
  muzyka: "bg-green-500 text-black",
  sport: "bg-blue-500 text-white",
}

// Kolory HEX dla znaczników/popupów na mapie (EventMap.tsx) — Leaflet
// renderuje je jako surowe stringi HTML (divIcon/popup), więc klasy
// Tailwind tam nie działają; potrzebne osobne wartości koloru.
export const CATEGORY_MAP_COLORS: Record<CategoryKey, string> = {
  kultura: "#8B5CF6",
  muzyka: "#22C55E",
  sport: "#3B82F6",
  festyny: "#F59E0B",
}
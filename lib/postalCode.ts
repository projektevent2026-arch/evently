// Wyciąga kod pocztowy z adresu odczytanego ze skanu plakatu.
// Plakaty zwykle mają "Rebenstraße, 66129 Bübingen" albo "ul. Chopina 4, 16-400 Suwałki"
// — AI wpisuje to w całości do pola Adres. Kod pocztowy ląduje w osobnym polu
// formularza (służy tylko geokoderowi), a z adresu znika.
//
// Rozpoznajemy: polski (16-400) oraz 5 cyfr (Niemcy, Francja i inne). Pięć cyfr
// liczy się jako kod tylko wtedy, gdy po nim idzie nazwa miejscowości (litera) albo
// to koniec tekstu — żeby nie wziąć za kod np. numeru domu w środku adresu.
export function splitPostalCode(address: string): { address: string; postal: string } {
    const a = (address || "").trim()
    const m = a.match(/(?:^|[\s,])(\d{2}-\d{3}|\d{5})(?=\s+\p{L}|\s*$)/u)
    if (!m) return { address: a, postal: "" }
    const postal = m[1]
    const cleaned = a
      .replace(postal, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^[\s,]+|[\s,]+$/g, "")
    return { address: cleaned, postal }
  }
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { safeProfileUrl, displayUrl } from "@/lib/safeUrl"
import { ArrowLeft, User, Pencil } from "lucide-react"
import ImageUpload from "@/components/admin/ImageUpload"

// 2026-09-29: profil organizatora — nazwa organizacji (np. "SOK Suwalski
// Ośrodek Kultury") + zdjęcie profilowe, oba OPCJONALNE i edytowalne
// wyłącznie przez samego właściciela konta (chronione przez middleware
// /moje-wydarzenia/:path* + RLS na profiles — każdy edytuje tylko swój
// wiersz). Dane sam dobrowolnie wprowadza organizator, może je w każdej
// chwili zmienić albo wyczyścić — stąd zgodne z RODO bez dodatkowej zgody
// (organizator sam decyduje, co pokazać, i sam to kontroluje).
//
// 2026-09-30: strona domyślnie pokazuje WIDOK (dane + e-mail, oba na tyle
// podstawowe, na ile RODO pozwala — to własne dane usera, pokazywane jemu
// samemu, nic nowego nie ujawniamy), edycja dopiero po kliknięciu
// "Edytuj" — nie ląduje się od razu w formularzu.
//
// 2026-10-02: wersja 1 publicznego profilu — dochodzą opis, miasto oraz
// linki (www, Facebook, Instagram). Wszystko oprócz telefonu jest PUBLICZNE
// (widok public_organizer_profiles, migracja 0002), więc formularz mówi to
// wprost. Linki są walidowane tu (safeProfileUrl) i dodatkowo ograniczeniami
// CHECK w bazie — bez tej drugiej warstwy można je ominąć zapisem przez API.

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: "0.9rem",
  marginBottom: 20,
  boxSizing: "border-box" as const,
  color: "#111827",
  background: "white",
}
const labelStyle = { display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 6 }
const hintStyle = { fontSize: "0.78rem", color: "#6b7280", margin: "-14px 0 20px" }
const sectionStyle = { fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" }

export default function ProfilOrganizatora() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [orgName, setOrgName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [city, setCity] = useState("")
  const [website, setWebsite] = useState("")
  const [facebook, setFacebook] = useState("")
  const [instagram, setInstagram] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<"view" | "edit">("view")
  // Kopie robocze — edytowane tylko w trybie "edit", żeby "Anuluj" mógł
  // po prostu odrzucić zmiany, bez ponownego pobierania z bazy.
  const [draftOrgName, setDraftOrgName] = useState("")
  const [draftAvatarUrl, setDraftAvatarUrl] = useState("")
  const [draftCoverUrl, setDraftCoverUrl] = useState("")
  const [draftPhone, setDraftPhone] = useState("")
  const [draftBio, setDraftBio] = useState("")
  const [draftCity, setDraftCity] = useState("")
  const [draftWebsite, setDraftWebsite] = useState("")
  const [draftFacebook, setDraftFacebook] = useState("")
  const [draftInstagram, setDraftInstagram] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      setEmail(user.email || "")

      const { data } = await supabase
        .from("profiles")
        .select("organization_name, avatar_url, cover_url, phone, bio, city, website_url, facebook_url, instagram_url")
        .eq("id", user.id)
        .single()

      if (data) {
        setOrgName(data.organization_name || "")
        setAvatarUrl(data.avatar_url || "")
        setCoverUrl(data.cover_url || "")
        setPhone(data.phone || "")
        setBio(data.bio || "")
        setCity(data.city || "")
        setWebsite(data.website_url || "")
        setFacebook(data.facebook_url || "")
        setInstagram(data.instagram_url || "")
      }
      setLoading(false)
    }
    load()
  }, [])

  function startEdit() {
    setDraftOrgName(orgName)
    setDraftAvatarUrl(avatarUrl)
    setDraftCoverUrl(coverUrl)
    setDraftPhone(phone)
    setDraftBio(bio)
    setDraftCity(city)
    setDraftWebsite(website)
    setDraftFacebook(facebook)
    setDraftInstagram(instagram)
    setMsg(null)
    setMode("edit")
  }

  async function handleSave() {
    if (!userId) return
    setMsg(null)

    // Walidacja linków PRZED zapisem. Puste pole = brak linku (null).
    const websiteNorm = draftWebsite.trim() ? safeProfileUrl(draftWebsite, "website") : null
    if (draftWebsite.trim() && !websiteNorm) {
      setMsg("Błąd: nieprawidłowy adres strony www (np. www.twojastrona.pl).")
      return
    }
    const facebookNorm = draftFacebook.trim() ? safeProfileUrl(draftFacebook, "facebook") : null
    if (draftFacebook.trim() && !facebookNorm) {
      setMsg("Błąd: podaj adres profilu na Facebooku (np. facebook.com/twojaorganizacja).")
      return
    }
    const instagramNorm = draftInstagram.trim() ? safeProfileUrl(draftInstagram, "instagram") : null
    if (draftInstagram.trim() && !instagramNorm) {
      setMsg("Błąd: podaj adres profilu na Instagramie (np. instagram.com/twojaorganizacja).")
      return
    }

    setSaving(true)

    // 2026-09-30: .select() na końcu jest celowy — bez niego Supabase
    // potrafi zwrócić "sukces" (error === null) nawet gdy RLS po cichu
    // zablokował zapis i faktycznie zmieniło się 0 wierszy. Sprawdzenie
    // długości zwróconych danych to jedyny sposób, żeby to odróżnić od
    // prawdziwego zapisu — dokładnie ten sam wzorzec co przy usuwaniu
    // wydarzenia w tym samym module.
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        organization_name: draftOrgName.trim() || null,
        avatar_url: draftAvatarUrl || null,
        cover_url: draftCoverUrl || null,
        phone: draftPhone.trim() || null,
        bio: draftBio.trim() || null,
        city: draftCity.trim() || null,
        website_url: websiteNorm,
        facebook_url: facebookNorm,
        instagram_url: instagramNorm,
      })
      .eq("id", userId)
      .select("organization_name, avatar_url, cover_url, phone, bio, city, website_url, facebook_url, instagram_url")

    setSaving(false)
    if (error) {
      setMsg("Błąd zapisu: " + error.message)
      return
    }
    if (!updated || updated.length === 0) {
      setMsg("Błąd zapisu: brak uprawnień do zapisania profilu (RLS). Sprawdź regułę update na tabeli profiles.")
      return
    }
    setOrgName(draftOrgName.trim())
    setAvatarUrl(draftAvatarUrl)
    setCoverUrl(draftCoverUrl)
    setPhone(draftPhone.trim())
    setBio(draftBio.trim())
    setCity(draftCity.trim())
    setWebsite(websiteNorm || "")
    setFacebook(facebookNorm || "")
    setInstagram(instagramNorm || "")
    setMode("view")
  }

  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16, fontSize: "0.85rem", padding: "8px 0", borderTop: "1px solid #f3f4f6", textAlign: "left" as const }
  const rowLabel = { color: "#6b7280", flexShrink: 0 }
  const rowValue = (set: boolean) => ({ color: set ? "#374151" : "#9ca3af", textAlign: "right" as const, wordBreak: "break-word" as const, overflowWrap: "anywhere" as const, minWidth: 0 })

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem" }}>
        <Link
          href="/moje-wydarzenia"
          style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", textDecoration: "none", fontSize: "0.85rem", marginBottom: "1.5rem" }}
        >
          <ArrowLeft size={16} /> Wróć do moich wydarzeń
        </Link>

        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px", color: "#111827" }}>Mój profil</h1>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : !userId ? (
          <p style={{ color: "#ef4444" }}>Musisz być zalogowany.</p>

        ) : mode === "view" ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 24px" }}>
              Nazwa, zdjęcia, opis, miasto i linki są publiczne: widać je na Twojej stronie organizatora i przy Twoich wydarzeniach. E-mail i telefon widzi tylko administrator.
            </p>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {coverUrl && (
                <img src={coverUrl} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginBottom: 14, background: "#f3f4f6" }} />
              )}
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", marginBottom: 14, background: "#f3f4f6" }} />
              ) : (
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#f3f4f6", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={36} color="#9ca3af" />
                </div>
              )}
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                {orgName || "Nazwa organizacji nie ustawiona"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 2 }}>
                {email}
              </div>
              <div style={{ fontSize: "0.85rem", color: phone ? "#374151" : "#9ca3af", marginTop: 2, marginBottom: 16 }}>
                {phone || "Telefon nie ustawiony"}
              </div>

              <div style={{ width: "100%", marginBottom: 16 }}>
                <div style={rowStyle}>
                  <span style={rowLabel}>Opis</span>
                  <span style={{ ...rowValue(!!bio), whiteSpace: "pre-line" }}>{bio || "brak"}</span>
                </div>
                <div style={rowStyle}>
                  <span style={rowLabel}>Miasto</span>
                  <span style={rowValue(!!city)}>{city || "brak"}</span>
                </div>
                <div style={rowStyle}>
                  <span style={rowLabel}>Strona www</span>
                  <span style={rowValue(!!website)}>{website ? displayUrl(website) : "brak"}</span>
                </div>
                <div style={rowStyle}>
                  <span style={rowLabel}>Facebook</span>
                  <span style={rowValue(!!facebook)}>{facebook ? displayUrl(facebook) : "brak"}</span>
                </div>
                <div style={rowStyle}>
                  <span style={rowLabel}>Instagram</span>
                  <span style={rowValue(!!instagram)}>{instagram ? displayUrl(instagram) : "brak"}</span>
                </div>
              </div>

              <button
                onClick={startEdit}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "white", border: "1px solid #e5e7eb", color: "#374151", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                <Pencil size={14} /> Edytuj profil
              </button>
              {(orgName || avatarUrl) && (
                <Link
                  href={`/organizator/${userId}`}
                  style={{ marginTop: 14, fontSize: "0.85rem", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}
                >
                  Zobacz swoją stronę publiczną →
                </Link>
              )}
            </div>
          </>

        ) : (
          <>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 24px" }}>
              Wszystkie pola są opcjonalne. Część publiczna będzie widoczna dla każdego w internecie, więc nie wpisuj tu nic, czego nie chcesz pokazywać publicznie.
            </p>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <p style={sectionStyle}>Publiczne</p>

              <label style={labelStyle}>Nazwa organizacji</label>
              <input
                value={draftOrgName}
                onChange={e => setDraftOrgName(e.target.value)}
                placeholder="np. SOK Suwalski Ośrodek Kultury"
                maxLength={100}
                style={inputStyle}
              />

              <label style={labelStyle}>Zdjęcie profilowe</label>
              {draftAvatarUrl && (
                <img src={draftAvatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 10, background: "#f3f4f6" }} />
              )}
              <ImageUpload currentUrl={draftAvatarUrl} onUploadComplete={setDraftAvatarUrl} />
              {draftAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setDraftAvatarUrl("")}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", padding: "4px 0", marginBottom: 10 }}
                >
                  Usuń zdjęcie
                </button>
              )}

              <label style={{ ...labelStyle, marginTop: 12 }}>Zdjęcie w tle (poziome, np. 1500×500)</label>
              {draftCoverUrl && (
                <img src={draftCoverUrl} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, marginBottom: 10, background: "#f3f4f6" }} />
              )}
              <ImageUpload currentUrl={draftCoverUrl} onUploadComplete={setDraftCoverUrl} />
              {draftCoverUrl && (
                <button
                  type="button"
                  onClick={() => setDraftCoverUrl("")}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", padding: "4px 0", marginBottom: 10 }}
                >
                  Usuń zdjęcie w tle
                </button>
              )}

              <label style={{ ...labelStyle, marginTop: 12 }}>Opis</label>
              <textarea
                value={draftBio}
                onChange={e => setDraftBio(e.target.value)}
                placeholder="Czym się zajmujecie, co organizujecie."
                maxLength={500}
                rows={4}
                style={{ ...inputStyle, marginBottom: 4, resize: "vertical", fontFamily: "inherit" }}
              />
              <p style={{ ...hintStyle, margin: "0 0 20px", textAlign: "right" }}>{draftBio.length}/500</p>

              <label style={labelStyle}>Miasto</label>
              <input
                value={draftCity}
                onChange={e => setDraftCity(e.target.value)}
                placeholder="np. Suwałki"
                maxLength={80}
                style={inputStyle}
              />

              <label style={labelStyle}>Strona www</label>
              <input
                value={draftWebsite}
                onChange={e => setDraftWebsite(e.target.value)}
                placeholder="www.twojastrona.pl"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                maxLength={200}
                style={inputStyle}
              />

              <label style={labelStyle}>Facebook</label>
              <input
                value={draftFacebook}
                onChange={e => setDraftFacebook(e.target.value)}
                placeholder="facebook.com/twojaorganizacja"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                maxLength={200}
                style={inputStyle}
              />

              <label style={labelStyle}>Instagram</label>
              <input
                value={draftInstagram}
                onChange={e => setDraftInstagram(e.target.value)}
                placeholder="instagram.com/twojaorganizacja"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                maxLength={200}
                style={inputStyle}
              />

              <p style={{ ...sectionStyle, marginTop: 8 }}>Niepubliczne (tylko administrator)</p>

              <label style={labelStyle}>
                Telefon kontaktowy
              </label>
              <input
                value={draftPhone}
                onChange={e => setDraftPhone(e.target.value)}
                placeholder="np. 501 234 567"
                type="tel"
                maxLength={20}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setMode("view"); setMsg(null) }}
                  disabled={saving}
                  style={{ flex: 1, padding: "10px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1, padding: "10px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Zapisywanie..." : "Zapisz"}
                </button>
              </div>

              {msg && (
                <p style={{ marginTop: 10, fontSize: "0.85rem", color: msg.startsWith("Błąd") ? "#ef4444" : "#16a34a" }}>{msg}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
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
export default function ProfilOrganizatora() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [orgName, setOrgName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<"view" | "edit">("view")
  // Kopie robocze — edytowane tylko w trybie "edit", żeby "Anuluj" mógł
  // po prostu odrzucić zmiany, bez ponownego pobierania z bazy.
  const [draftOrgName, setDraftOrgName] = useState("")
  const [draftAvatarUrl, setDraftAvatarUrl] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      setEmail(user.email || "")

      const { data } = await supabase
        .from("profiles")
        .select("organization_name, avatar_url")
        .eq("id", user.id)
        .single()

      if (data) {
        setOrgName(data.organization_name || "")
        setAvatarUrl(data.avatar_url || "")
      }
      setLoading(false)
    }
    load()
  }, [])

  function startEdit() {
    setDraftOrgName(orgName)
    setDraftAvatarUrl(avatarUrl)
    setMsg(null)
    setMode("edit")
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from("profiles")
      .update({
        organization_name: draftOrgName.trim() || null,
        avatar_url: draftAvatarUrl || null,
      })
      .eq("id", userId)

    setSaving(false)
    if (error) {
      setMsg("Błąd zapisu: " + error.message)
      return
    }
    setOrgName(draftOrgName.trim())
    setAvatarUrl(draftAvatarUrl)
    setMode("view")
  }

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
              Podstawowe dane konta. Nazwa i zdjęcie opcjonalne, widoczne dla administratora.
            </p>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
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
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 2, marginBottom: 20 }}>
                {email}
              </div>
              <button
                onClick={startEdit}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "white", border: "1px solid #e5e7eb", color: "#374151", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                <Pencil size={14} /> Edytuj profil
              </button>
            </div>
          </>

        ) : (
          <>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 24px" }}>
              Oba pola opcjonalne. Widoczne dla administratora i (w przyszłości) przy Twoich wydarzeniach.
            </p>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Nazwa organizacji
              </label>
              <input
                value={draftOrgName}
                onChange={e => setDraftOrgName(e.target.value)}
                placeholder="np. SOK Suwalski Ośrodek Kultury"
                maxLength={100}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20, boxSizing: "border-box", color: "#111827", background: "white" }}
              />

              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Zdjęcie profilowe
              </label>
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
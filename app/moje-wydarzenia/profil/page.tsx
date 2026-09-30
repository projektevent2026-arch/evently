"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { ArrowLeft } from "lucide-react"
import ImageUpload from "@/components/admin/ImageUpload"

// 2026-09-29: profil organizatora — nazwa organizacji (np. "SOK Suwalski
// Ośrodek Kultury") + zdjęcie profilowe, oba OPCJONALNE i edytowalne
// wyłącznie przez samego właściciela konta (chronione przez middleware
// /moje-wydarzenia/:path* + RLS na profiles — każdy edytuje tylko swój
// wiersz). Dane sam dobrowolnie wprowadza organizator, może je w każdej
// chwili zmienić albo wyczyścić — stąd zgodne z RODO bez dodatkowej zgody
// (organizator sam decyduje, co pokazać, i sam to kontroluje).
//
// Efekt uboczny (zamierzony): po ustawieniu nazwy tutaj, przyszłe
// wydarzenia dodawane przez tego organizatora mogą z niej korzystać do
// automatycznego wypełnienia pola "Organizator" — nieużywane jeszcze
// nigdzie, ale nazwa kolumny (organization_name) jest z tą myślą.
export default function ProfilOrganizatora() {
  const [userId, setUserId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

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

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from("profiles")
      .update({
        organization_name: orgName.trim() || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", userId)

    setSaving(false)
    setMsg(error ? "Błąd zapisu: " + error.message : "Zapisano.")
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
        <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 24px" }}>
          Oba pola opcjonalne. Widoczne dla administratora i (w przyszłości) przy Twoich wydarzeniach.
        </p>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : !userId ? (
          <p style={{ color: "#ef4444" }}>Musisz być zalogowany.</p>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Nazwa organizacji
            </label>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="np. SOK Suwalski Ośrodek Kultury"
              maxLength={100}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20, boxSizing: "border-box", color: "#111827", background: "white" }}
            />

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Zdjęcie profilowe
            </label>
            {avatarUrl && (
              <img src={avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 10, background: "#f3f4f6" }} />
            )}
            <ImageUpload currentUrl={avatarUrl} onUploadComplete={setAvatarUrl} />
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", padding: "4px 0", marginBottom: 10 }}
              >
                Usuń zdjęcie
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", padding: "10px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginTop: 12 }}
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>

            {msg && (
              <p style={{ marginTop: 10, fontSize: "0.85rem", color: msg.startsWith("Błąd") ? "#ef4444" : "#16a34a" }}>{msg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
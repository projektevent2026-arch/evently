"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { revalidateHome } from "@/lib/revalidateHome"
import { safeUrl } from "@/lib/safeUrl"
import { normalizeCategory, CATEGORY_LABELS, type CategoryKey } from "@/lib/eventCategory"
import { MapPin, Pencil, Plus, Trash2, User, Search, Eye, RotateCcw, Camera, Image as ImageIcon } from "lucide-react"
import GalleryUpload, { GALLERY_MAX } from "@/components/admin/GalleryUpload"

// 2026-09-29: dociągnięte do poziomu panelu admina (szukaj/filtry/
// sortowanie/podgląd), na wyraźną prośbę — wcześniej to była gołą listą
// bez żadnego z tych czterech. Świadomie POMINIĘTE względem admin/page.tsx,
// bo organizator tego nie potrzebuje: zaznaczanie wielu naraz (admin
// zarządza cudzymi wydarzeniami hurtowo, organizator ma tylko swoje, i
// zwykle niewiele), przełącznik "tylko moje" (tu wszystko i tak jest jego),
// status "Oczekujące" jako osobna zakładka (organizator publikuje od razu
// — patrz status: isOrganizer ? "published" : "pending" w dodaj-wydarzenie
// — więc ta zakładka byłaby zawsze pusta w normalnym użyciu; zostawiona
// jednak jako filtr w środku "Wszystkie", nie osobna zakładka, na wszelki
// wypadek). Middleware już wymaga zalogowania przed wejściem tutaj — filtr
// po created_by (i RLS po stronie bazy) pilnuje, że każdy widzi i edytuje
// wyłącznie swoje.
//
// 2026-10-21: przy zakończonym (zarchiwizowanym) wydarzeniu jest przycisk "Dodaj zdjęcia" —
// organizator wkleja tu link do albumu (events.photos_url) bez wchodzenia w pełną edycję.
// Link pokazuje się jako przycisk na stronie zakończonego wydarzenia.
const STATUS_TABS = [
  { id: "all", label: "Wszystkie" },
  { id: "published", label: "Opublikowane" },
  { id: "draft", label: "Szkice" },
  { id: "archived", label: "Archiwum" },
  { id: "trash", label: "Kosz" },
]

const CAT_PILLS: { id: "all" | CategoryKey; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "festyny", label: CATEGORY_LABELS.festyny },
  { id: "kultura", label: CATEGORY_LABELS.kultura },
  { id: "muzyka", label: CATEGORY_LABELS.muzyka },
  { id: "sport", label: CATEGORY_LABELS.sport },
  { id: "targi", label: CATEGORY_LABELS.targi },
  { id: "jedzenie", label: CATEGORY_LABELS.jedzenie },
]

export default function MojeWydarzenia() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusTab, setStatusTab] = useState("all")
  const [catFilter, setCatFilter] = useState<"all" | CategoryKey>("all")
  const [sortBy, setSortBy] = useState("date_desc")
  // 2026-09-30: zdjęcie profilowe do wizualnego znaku "jesteś zalogowany"
  // w nagłówku — zamiast samego przycisku tekstowego "Mój profil".
  const [avatarUrl, setAvatarUrl] = useState("")

  // Edycja linku do zdjęć: id wydarzenia, które ma otwarte pole, wpisana wartość, stan zapisu.
  const [photosEditId, setPhotosEditId] = useState<string | null>(null)
  const [photosValue, setPhotosValue] = useState("")
  const [photosSaving, setPhotosSaving] = useState(false)
  const [photosError, setPhotosError] = useState<string | null>(null)

  // Galeria (do 6 zdjęć): id wydarzenia z otwartym panelem i komunikat błędu zapisu.
  const [galleryEditId, setGalleryEditId] = useState<string | null>(null)
  const [galleryError, setGalleryError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Wszystkie statusy + deleted_at naraz (nie tylko is("deleted_at", null)
      // jak wcześniej) — inaczej zakładka "Kosz" nie miałaby czego pokazać.
      const [{ data }, { data: profile }] = await Promise.all([
        supabase
          .from("events")
          .select("id, slug, title, start_date, status, deleted_at, cover_image_url, image_url, category, city, venue_name, photos_url, gallery_urls")
          .eq("created_by", user.id)
          .order("start_date", { ascending: false }),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).single(),
      ])

      setEvents(data || [])
      setAvatarUrl(profile?.avatar_url || "")
      setLoading(false)
    }
    load()
  }, [])

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "—"

  const norm = (s: string) =>
    s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  const filtered = events
    .filter(e => statusTab === "trash" ? e.deleted_at !== null : e.deleted_at === null)
    .filter(e => statusTab === "all" || statusTab === "trash" || e.status === statusTab)
    .filter(e => catFilter === "all" || normalizeCategory(e.category) === catFilter)
    .filter(e => {
      const q = norm(search.trim())
      if (!q) return true
      const hay = norm([e.title, e.city, e.venue_name].filter(Boolean).join(" "))
      return q.split(/\s+/).every(w => hay.includes(w))
    })
    .sort((a, b) => {
      if (sortBy === "date_asc") return (a.start_date || "").localeCompare(b.start_date || "")
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "", "pl")
      return (b.start_date || "").localeCompare(a.start_date || "")
    })

  // "Usuń" = przeniesienie do kosza (deleted_at), tak samo jak w panelu admina.
  // Wcześniej to było trwałe DELETE, którego baza organizatorowi nie pozwala
  // (RLS: kasować wydarzenia może tylko admin/moderator), a co gorsza kod
  // najpierw kasował terminy z event_dates (to organizatorowi wolno), więc po
  // nieudanym usunięciu wydarzenie zostawało BEZ dat i znikało ze strony
  // głównej. Teraz terminów nie ruszamy, a kosz czyści się sam po 30 dniach
  // (purge_trash). Z kosza można wydarzenie przywrócić.
  async function setTrashed(id: string, trashed: boolean) {
    setDeleteError(null)
    setDeletingId(id)

    const deletedAt = trashed ? new Date().toISOString() : null
    const { data, error } = await supabase
      .from("events")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .select("id")

    setDeletingId(null)

    if (error || !data || data.length === 0) {
      const msg = "Nie udało się " + (trashed ? "usunąć" : "przywrócić") + " wydarzenia" + (error ? ": " + error.message : " — brak uprawnień do tego wydarzenia.")
      setDeleteError(msg)
      // Komunikat na górze listy łatwo przeoczyć, gdy kliknięto przycisk niżej.
      window.alert(msg)
      return
    }

    setEvents(prev => prev.map(e => (e.id === id ? { ...e, deleted_at: deletedAt } : e)))
    revalidateHome()
  }

  function openPhotos(id: string, current: string | null) {
    setPhotosError(null)
    setPhotosValue(current || "")
    setPhotosEditId(id)
  }

  // Zapis linku do zdjęć. Pusty link = usunięcie. Zły link (np. javascript:...) odrzucamy z komunikatem,
  // zamiast po cichu zapisać puste pole. Po update sprawdzamy, że wiersz faktycznie się zmienił
  // (RLS potrafi zablokować zapis bez błędu, tak samo jak przy przenoszeniu do kosza wyżej).
  async function savePhotos(id: string) {
    setPhotosError(null)
    const raw = photosValue.trim()
    const cleaned = raw ? safeUrl(raw) : null
    if (raw && !cleaned) {
      setPhotosError("Link musi zaczynać się od http:// albo https://")
      return
    }
    if (cleaned && cleaned.length > 500) {
      setPhotosError("Link jest za długi (maksymalnie 500 znaków).")
      return
    }

    setPhotosSaving(true)
    const { data, error } = await supabase
      .from("events")
      .update({ photos_url: cleaned })
      .eq("id", id)
      .select("id")
    setPhotosSaving(false)

    if (error || !data || data.length === 0) {
      setPhotosError("Nie udało się zapisać linku" + (error ? ": " + error.message : " — brak uprawnień do tego wydarzenia."))
      return
    }

    setEvents(prev => prev.map(e => (e.id === id ? { ...e, photos_url: cleaned } : e)))
    setPhotosEditId(null)
    setPhotosValue("")
  }

  // Zapis galerii od razu po każdej zmianie (dodanie, usunięcie, kolejność). Zwraca false przy błędzie,
  // wtedy GalleryUpload przerywa wysyłanie kolejnych zdjęć. Sprawdzamy, że wiersz faktycznie się zmienił
  // (RLS potrafi zablokować zapis bez błędu).
  async function saveGallery(id: string, next: string[]): Promise<boolean> {
    setGalleryError(null)
    const { data, error } = await supabase
      .from("events")
      .update({ gallery_urls: next.slice(0, GALLERY_MAX) })
      .eq("id", id)
      .select("id")

    if (error || !data || data.length === 0) {
      setGalleryError("Nie udało się zapisać galerii" + (error ? ": " + error.message : " — brak uprawnień do tego wydarzenia."))
      return false
    }
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, gallery_urls: next } : e)))
    return true
  }

  function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(
      `Przenieść „${title}" do kosza?\n\nWydarzenie zniknie ze strony. W koszu będzie przez 30 dni i możesz je stamtąd przywrócić.`
    )
    if (!confirmed) return
    void setTrashed(id, true)
  }

  const pillStyle = (active: boolean) => ({
    padding: "5px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
    cursor: "pointer", border: "1px solid " + (active ? "#16a34a" : "#333"),
    background: active ? "#16a34a" : "#1f1f1f", color: active ? "white" : "#9ca3af",
    whiteSpace: "nowrap" as const,
  })

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "sans-serif" }}>
      <header style={{ background: "#141414", borderBottom: "1px solid #262626", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#16a34a" }}>evently</span>
        </Link>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Moje wydarzenia</span>
      </header>

      <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Moje wydarzenia</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/moje-wydarzenia/profil" title="Mój profil — jesteś zalogowany" style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e5e7eb", color: "#374151", borderRadius: 10, padding: "0.5rem 1rem 0.5rem 0.5rem", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={14} color="#9ca3af" />
                </div>
              )}
              Mój profil
            </Link>
            <Link href="/dodaj-wydarzenie" style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "white", borderRadius: 10, padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
              <Plus size={16} /> Dodaj wydarzenie
            </Link>
          </div>
        </div>

        {/* Szukaj */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po nazwie, mieście, miejscu..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#161616", border: "1px solid #262626", borderRadius: 10, color: "white", fontSize: "0.88rem", boxSizing: "border-box" }}
          />
        </div>

        {/* Zakładki statusu */}
        <div className="scrollbar-hide" style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
          {STATUS_TABS.map(t => (
            <span key={t.id} onClick={() => setStatusTab(t.id)} style={pillStyle(statusTab === t.id)}>
              {t.label}
            </span>
          ))}
        </div>

        {/* Kategorie + sortowanie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div className="scrollbar-hide" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {CAT_PILLS.map(c => (
              <span key={c.id} onClick={() => setCatFilter(c.id)} style={pillStyle(catFilter === c.id)}>
                {c.label}
              </span>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ background: "#161616", border: "1px solid #262626", borderRadius: 8, color: "#d1d5db", fontSize: "0.8rem", padding: "6px 8px" }}
          >
            <option value="date_desc">Data: od najnowszych</option>
            <option value="date_asc">Data: od najstarszych</option>
            <option value="title">Nazwa A-Z</option>
          </select>
        </div>

        {deleteError && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}>{deleteError}</p>
        )}

        {loading ? (
          <p style={{ color: "#6b7280" }}>Ładowanie...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6b7280" }}>
            {events.length === 0 ? "Nie masz jeszcze żadnych wydarzeń." : "Brak wydarzeń pasujących do filtrów."}
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 10 }}>
              {filtered.length} z {events.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(event => (
                <div key={event.id} style={{ background: "#161616", border: "1px solid #262626", borderRadius: 12, padding: "1rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    {event.cover_image_url || event.image_url ? (
                      <img
                        src={event.cover_image_url || event.image_url}
                        alt=""
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#1f1f1f" }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1f1f1f", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        📅 {fmtDate(event.start_date)} · {event.deleted_at ? "W koszu" : event.status === "published" ? "Opublikowane" : event.status === "draft" ? "Szkic" : event.status === "archived" ? "Archiwum" : event.status}
                      </div>
                      {(event.city || event.category) && (
                        <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>
                          {[event.city, event.category && CATEGORY_LABELS[normalizeCategory(event.category)]].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {event.slug && !event.deleted_at && event.status === "published" && (
                      <a
                        href={`/events/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #333", color: "white", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                      >
                        <Eye size={14} /> Podgląd
                      </a>
                    )}
                    {event.deleted_at ? (
                      <button
                        type="button"
                        onClick={() => setTrashed(event.id, false)}
                        disabled={deletingId === event.id}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #14532d", color: "#22c55e", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: deletingId === event.id ? "not-allowed" : "pointer", opacity: deletingId === event.id ? 0.6 : 1 }}
                      >
                        <RotateCcw size={14} /> {deletingId === event.id ? "Przywracanie..." : "Przywróć"}
                      </button>
                    ) : (
                      <>
                        {event.status === "archived" && (
                          <button
                            type="button"
                            onClick={() => (photosEditId === event.id ? setPhotosEditId(null) : openPhotos(event.id, event.photos_url))}
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #14532d", color: "#22c55e", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            <Camera size={14} /> {event.photos_url ? "Zmień zdjęcia" : "Dodaj zdjęcia"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setGalleryError(null); setGalleryEditId(galleryEditId === event.id ? null : event.id) }}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #333", color: "white", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          <ImageIcon size={14} /> Galeria ({Array.isArray(event.gallery_urls) ? event.gallery_urls.length : 0}/{GALLERY_MAX})
                        </button>
                        <Link
                          href={`/dodaj-wydarzenie?edit=${event.id}`}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #333", color: "white", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          <Pencil size={14} /> Edytuj
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id, event.title)}
                          disabled={deletingId === event.id}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f1f1f", border: "1px solid #7f1d1d", color: "#ef4444", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: deletingId === event.id ? "not-allowed" : "pointer", opacity: deletingId === event.id ? 0.6 : 1 }}
                        >
                          <Trash2 size={14} /> {deletingId === event.id ? "Usuwanie..." : "Usuń"}
                        </button>
                      </>
                    )}
                  </div>
                  {galleryEditId === event.id && !event.deleted_at && (
                    <div style={{ width: "100%", borderTop: "1px solid #262626", paddingTop: 12 }}>
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: "0 0 10px" }}>
                        Zdjęcia z wydarzenia (do {GALLERY_MAX}). Zmiany zapisują się od razu. Wgrywaj tylko zdjęcia, do których masz prawa, i unikaj zdjęć z wyraźnie widocznymi twarzami osób prywatnych bez ich zgody.
                      </p>
                      <GalleryUpload
                        dark
                        value={Array.isArray(event.gallery_urls) ? event.gallery_urls : []}
                        onChange={(next) => saveGallery(event.id, next)}
                      />
                      {galleryError && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "8px 0 0" }}>{galleryError}</p>}
                    </div>
                  )}
                  {photosEditId === event.id && !event.deleted_at && (
                    <div style={{ width: "100%", borderTop: "1px solid #262626", paddingTop: 12 }}>
                      <label htmlFor={`photos-${event.id}`} style={{ display: "block", fontSize: "0.8rem", color: "#9ca3af", marginBottom: 6 }}>
                        Link do zdjęć z wydarzenia (album na Facebooku, Google Photos itp.). Pusty zapis usuwa link.
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          id={`photos-${event.id}`}
                          value={photosValue}
                          onChange={e => setPhotosValue(e.target.value)}
                          placeholder="https://..."
                          style={{ flex: 1, minWidth: 200, padding: "9px 12px", background: "#0f0f0f", border: "1px solid #333", borderRadius: 8, color: "white", fontSize: "0.88rem", boxSizing: "border-box" }}
                        />
                        <button
                          type="button"
                          onClick={() => savePhotos(event.id)}
                          disabled={photosSaving}
                          style={{ background: "#16a34a", border: "none", color: "white", borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, cursor: photosSaving ? "not-allowed" : "pointer", opacity: photosSaving ? 0.6 : 1 }}
                        >
                          {photosSaving ? "Zapisywanie..." : "Zapisz"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotosEditId(null)}
                          style={{ background: "#1f1f1f", border: "1px solid #333", color: "white", borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          Anuluj
                        </button>
                      </div>
                      {photosError && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "8px 0 0" }}>{photosError}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
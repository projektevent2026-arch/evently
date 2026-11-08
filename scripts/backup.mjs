// scripts/backup.mjs
// Kopia zapasowa DANYCH: tabele z schematu public (JSON) + pliki z bucketu event-images.
// Uruchom z głównego folderu projektu:
//   node --env-file=.env.local scripts/backup.mjs
// Wynik: backups/RRRR-MM-DD/   (NIE commituj tego folderu: są tam dane osobowe, np. e-maile z event_contacts)
// Struktura bazy (polityki, funkcje, widoki) jest w supabase/migrations, to osobna sprawa.
//
// Skrypt używa klucza service_role z .env.local, więc działa tylko u Ciebie lokalnie.
// Lista TABLES musi odpowiadać tabelom z:  select tablename from pg_tables where schemaname = 'public' order by 1;
// Nieznana nazwa tabeli nie psuje reszty: skrypt zgłosi błąd i skończy z kodem 1.

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const TABLES = [
  'events',
  'event_dates',
  'event_contacts',
  'event_attendees',
  'profiles',
  'saved_events',
]
const BUCKET = 'event-images'
const PAGE = 1000

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY. Uruchom: node --env-file=.env.local scripts/backup.mjs')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const day = new Date().toISOString().slice(0, 10)
const root = path.join('backups', day)
await mkdir(path.join(root, BUCKET), { recursive: true })

let failed = 0

// 1) Tabele
for (const table of TABLES) {
  const rows = []
  let ok = true
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) {
      console.error(`BŁĄD, tabela ${table}: ${error.message}`)
      failed++
      ok = false
      break
    }
    rows.push(...data)
    if (data.length < PAGE) break
  }
  if (ok) {
    await writeFile(path.join(root, `${table}.json`), JSON.stringify(rows, null, 2))
    console.log(`${table}: ${rows.length} wierszy`)
  }
}

// 2) Pliki z bucketu (tylko katalog główny: tak wgrywa kod aplikacji; podfoldery są zgłaszane)
let files = 0
let folders = 0
for (let offset = 0; ; offset += 100) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
  if (error) {
    console.error(`BŁĄD, lista plików ${BUCKET}: ${error.message}`)
    failed++
    break
  }
  if (!data || data.length === 0) break
  for (const f of data) {
    if (!f.id) { folders++; continue } // podfolder
    const { data: blob, error: dErr } = await supabase.storage.from(BUCKET).download(f.name)
    if (dErr || !blob) {
      console.error(`BŁĄD, plik ${f.name}: ${dErr?.message || 'brak danych'}`)
      failed++
      continue
    }
    await writeFile(path.join(root, BUCKET, f.name), Buffer.from(await blob.arrayBuffer()))
    files++
  }
}
console.log(`${BUCKET}: ${files} plików`)
if (folders > 0) console.warn(`UWAGA: pominięto ${folders} podfolderów w ${BUCKET} (skrypt kopiuje tylko katalog główny)`)

console.log(failed === 0 ? `Gotowe: ${root}` : `Zakończono z błędami (${failed}). Sprawdź komunikaty powyżej: ${root}`)
process.exit(failed === 0 ? 0 : 1)
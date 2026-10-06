-- 0003_organizer_cover.sql
-- Zdjęcie w tle (okładka) na publicznej stronie organizatora. Wgrywa je sam organizator
-- w swoim profilu (ten sam upload do bucketu event-images co awatar).
--
-- KOLEJNOŚĆ: najpierw ta migracja w Supabase, dopiero potem wdrożenie kodu (kod czyta nową kolumnę).
-- Usunięcie niechcianej okładki przez administratora (jeśli kiedyś będzie potrzebne):
--   update public.profiles set cover_url = null where id = '<id organizatora>';

-- 1) Nowa kolumna + walidacja po stronie bazy (polityka UPDATE na profiles pozwala zapisać własny wiersz
--    bezpośrednio przez API, więc samo sprawdzenie w formularzu nie wystarczy).
alter table public.profiles add column if not exists cover_url text;

alter table public.profiles add constraint profiles_cover_url_check
  check (cover_url is null or (char_length(cover_url) <= 300 and cover_url ~* '^https://[^\s]+$'));

-- 2) Widok publiczny: jawna lista kolumn (NIGDY phone ani role). CREATE OR REPLACE VIEW pozwala tylko
--    dopisać kolumny na końcu, kolejność dotychczasowych zostaje.
create or replace view public.public_organizer_profiles
with (security_invoker = false) as
select id, organization_name, avatar_url, bio, city, website_url, facebook_url, instagram_url, cover_url
from public.profiles
where coalesce(organization_name, '') <> '' or coalesce(avatar_url, '') <> '';

-- 3) Widok jest auto-aktualizowalny i działa z uprawnieniami właściciela: zapis przez niego musi być zamknięty.
revoke all on public.public_organizer_profiles from anon, authenticated;
grant select on public.public_organizer_profiles to anon, authenticated;

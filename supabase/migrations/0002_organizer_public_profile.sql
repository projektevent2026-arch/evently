-- 0002_organizer_public_profile.sql
-- Wersja 1 publicznego profilu organizatora: opis (bio), miasto (city, już istnieją) oraz trzy nowe linki:
-- strona www, Facebook, Instagram. Wszystko wpisuje sam organizator na stronie profilu.
--
-- PRZED URUCHOMIENIEM sprawdź, czy w istniejących kontach nie ma danych, których nie chcesz upubliczniać
-- (widok publiczny po tej migracji zacznie pokazywać bio i city każdego konta z nazwą lub zdjęciem):
--   select id, role, bio, city from public.profiles where bio is not null or city is not null;
-- Jeśli coś tam jest, wyczyść: update public.profiles set bio = null, city = null where id = '<id>';
--
-- KOLEJNOŚĆ: najpierw ta migracja w Supabase, dopiero potem wdrożenie kodu (kod czyta nowe kolumny).

-- 1) Nowe kolumny
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists facebook_url text;
alter table public.profiles add column if not exists instagram_url text;

-- 2) Walidacja po stronie bazy. Polityka UPDATE na profiles pozwala zalogowanemu zmieniać własny wiersz
--    bezpośrednio przez API, więc sprawdzenie w formularzu nie wystarczy.
alter table public.profiles add constraint profiles_bio_length_check
  check (bio is null or char_length(bio) <= 500);

alter table public.profiles add constraint profiles_city_length_check
  check (city is null or char_length(city) <= 80);

alter table public.profiles add constraint profiles_website_url_check
  check (website_url is null or (char_length(website_url) <= 200 and website_url ~* '^https://[^\s]+$'));

alter table public.profiles add constraint profiles_facebook_url_check
  check (facebook_url is null or (char_length(facebook_url) <= 200
    and facebook_url ~* '^https://(www\.|m\.)?(facebook\.com|fb\.com)/[^\s]+$'));

alter table public.profiles add constraint profiles_instagram_url_check
  check (instagram_url is null or (char_length(instagram_url) <= 200
    and instagram_url ~* '^https://(www\.)?instagram\.com/[^\s]+$'));

-- 3) Widok publiczny: jawna lista kolumn (NIGDY phone ani role). CREATE OR REPLACE VIEW pozwala tylko
--    dopisać kolumny na końcu, kolejność dotychczasowych zostaje.
create or replace view public.public_organizer_profiles
with (security_invoker = false) as
select id, organization_name, avatar_url, bio, city, website_url, facebook_url, instagram_url
from public.profiles
where coalesce(organization_name, '') <> '' or coalesce(avatar_url, '') <> '';

-- 4) Widok jest auto-aktualizowalny i działa z uprawnieniami właściciela: zapis przez niego musi być zamknięty.
revoke all on public.public_organizer_profiles from anon, authenticated;
grant select on public.public_organizer_profiles to anon, authenticated;

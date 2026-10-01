-- 4_fix_organizer_views.sql
-- Naprawia dwie rzeczy, które według dumpu uniemożliwiają działanie /organizator/[id]
-- oraz karty organizatora na stronie wydarzenia:
--  1) widok published_events_with_next_date nie ma kolumny created_by,
--     a strona filtruje po niej (zapytanie kończy się błędem "column does not exist"),
--  2) widok public_organizer_profiles jest security_invoker nad profiles, gdzie jedyna polityka SELECT
--     to "tylko własny wiersz, tylko authenticated" -> anon widzi 0 wierszy (brak nazwy i awatara).
-- Puść w SQL Editor w jednym przebiegu. Po puszczeniu sprawdź w oknie incognito /organizator/<id>.

-- 1) created_by na końcu listy kolumn (CREATE OR REPLACE VIEW pozwala tylko DOPISAĆ kolumnę na końcu).
create or replace view public.published_events_with_next_date
with (security_invoker = true) as
select
  e.id, e.created_at, e.updated_at, e.title, e.slug, e.description, e.short_description,
  e.start_date, e.end_date, e.city, e.address, e.venue_name, e.latitude, e.longitude,
  e.country_code, e.category, e.tags, e.cover_image_url, e.is_free, e.price_from, e.ticket_url,
  e.organizer_name, e.website_url, e.status, e.is_featured, e.view_count, e.save_count,
  e.image_url, e.schedule, e.schedule_type,
  d.date as next_date,
  d.start_time as next_start_time,
  d.end_time as next_end_time,
  d.starts_at as next_starts_at,
  e.created_by
from public.events e
join lateral (
  select ed.date, ed.start_time, ed.end_time, ed.starts_at
  from public.event_dates ed
  where ed.event_id = e.id
    and coalesce(
          (ed.date + ed.end_time) at time zone 'Europe/Warsaw',
          (ed.date + time '23:59:59') at time zone 'Europe/Warsaw'
        ) >= now()
  order by ed.starts_at
  limit 1
) d on true
where e.status = 'published' and e.deleted_at is null;

-- 2) Widok publiczny: tylko 3 kolumny, tylko konta, które cokolwiek ustawiły publicznie.
--    security_invoker = false => widok czyta profiles z uprawnieniami właściciela (omija RLS),
--    dlatego WYŁĄCZNIE te trzy kolumny. Nigdy phone ani role.
create or replace view public.public_organizer_profiles
with (security_invoker = false) as
select id, organization_name, avatar_url
from public.profiles
where coalesce(organization_name, '') <> '' or coalesce(avatar_url, '') <> '';

-- 3) OBOWIĄZKOWE przy widoku bez security_invoker: to jest prosty, auto-aktualizowalny widok,
--    więc bez tego anon mógłby przez niego ZMIENIAĆ nazwę i awatar cudzych profili (uprawnienia właściciela).
revoke all on public.public_organizer_profiles from anon, authenticated;
grant select on public.public_organizer_profiles to anon, authenticated;

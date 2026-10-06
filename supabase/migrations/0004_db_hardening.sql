-- 0004_db_hardening.sql
-- Trzy bezpieczne poprawki bazy (stan po migracjach 0000-0003):
--  1) funkcje bez ustawionego search_path (SECURITY DEFINER i archive_past_events) dostają search_path = public,
--  2) funkcje wewnętrzne (czyszczenie kosza, archiwizacja, triggery) nie są już wywoływalne przez API
--     przez anon i zalogowanych; cron (postgres) i triggery działają jak dotąd,
--  3) archive_past_events(): godziny końca liczone w czasie polskim (Europe/Warsaw), a nie jako UTC, jak w widoku
--     published_events_with_next_date; wydarzenia bez wierszy w event_dates nie są już archiwizowane od razu,
--     tylko gdy minął ich koniec (end_date, a bez niego start_date + 1 dzień).
--
-- NIE zmienia: increment_view_count() i replace_event_dates() (wywoływane z przeglądarki, zostają dostępne),
-- harmonogramu cron (archive-past-events 02:00 UTC, purge-trash 03:00 UTC), polityk RLS ani widoków.

-- 3) archive_past_events (CREATE OR REPLACE zachowuje właściciela i uprawnienia, search_path ustawiany tutaj)
create or replace function public.archive_past_events()
 returns void
 language plpgsql
 set search_path = public
as $function$
begin
  update public.events e
  set status = 'archived'
  where e.status = 'published'
    and (
      -- wydarzenie z terminami: archiwizuj, gdy żaden termin się nie zaczyna ani nie trwa
      (
        exists (select 1 from public.event_dates ed0 where ed0.event_id = e.id)
        and not exists (
          select 1 from public.event_dates ed
          where ed.event_id = e.id
            and coalesce(
                  (ed.date + ed.end_time) at time zone 'Europe/Warsaw',
                  (ed.date + time '23:59:59') at time zone 'Europe/Warsaw'
                ) >= now()
        )
      )
      or
      -- starszy rekord bez terminów: archiwizuj dopiero po jego końcu
      (
        not exists (select 1 from public.event_dates ed1 where ed1.event_id = e.id)
        and coalesce(e.end_date, e.start_date + interval '1 day') < now()
      )
    );
end;
$function$;

-- 1) search_path dla pozostałych funkcji SECURITY DEFINER (i tak używały pełnych nazw lub public)
alter function public.handle_new_user() set search_path = public;
alter function public.prevent_self_role_change() set search_path = public;
alter function public.purge_trash() set search_path = public;

-- 2) uprawnienia EXECUTE: tylko właściciel i service_role
revoke execute on function public.purge_trash() from public, anon, authenticated;
revoke execute on function public.archive_past_events() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_self_role_change() from public, anon, authenticated;

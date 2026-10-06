-- 0006_drop_organizer_email.sql
-- URUCHOM DOPIERO PO: (1) migracji 0005, (2) wdrożeniu nowego kodu formularza (czyta i zapisuje event_contacts)
-- i (3) teście, że nowe zgłoszenie z e-mailem trafia do event_contacts.
--
-- Usuwa starą kolumnę events.organizer_email (dostępną dla każdego zalogowanego). Skrypt ma bezpiecznik:
-- przerywa się, jeśli jakiś adres z kolumny nie został przeniesiony do event_contacts, żeby nic nie przepadło.
--   * Jeśli przerwie się z powodu adresu z literówką (np. "to-nie-jest-email"), wyczyść go albo popraw:
--       select id, slug, organizer_email from public.events
--       where nullif(btrim(organizer_email), '') is not null
--         and id not in (select event_id from public.event_contacts);
--       update public.events set organizer_email = null where id = '<id>';   -- albo popraw adres i powtórz INSERT z 0005
--   * Jeśli przerwie się z powodu zgłoszeń dodanych starym kodem już po 0005, powtórz samo przeniesienie:
--       insert into public.event_contacts (event_id, email) select id, btrim(organizer_email) from public.events
--       where nullif(btrim(organizer_email), '') is not null
--         and btrim(organizer_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' on conflict (event_id) do nothing;

do $$
declare missing int;
begin
  select count(*) into missing
  from public.events e
  where nullif(btrim(e.organizer_email), '') is not null
    and not exists (select 1 from public.event_contacts c where c.event_id = e.id);
  if missing > 0 then
    raise exception 'Przerwano: % wydarzeń ma organizer_email, którego nie ma w event_contacts. Przenieś je albo wyczyść (patrz komentarz na górze pliku) i uruchom ponownie.', missing;
  end if;
end $$;

alter table public.events drop column organizer_email;

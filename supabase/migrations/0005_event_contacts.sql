-- 0005_event_contacts.sql
-- Adres e-mail osoby zgłaszającej wydarzenie (dotąd kolumna events.organizer_email) trafia do osobnej tabeli
-- z RLS. Powód: tabela events jest czytelna dla każdego zalogowanego, więc każdy organizator mógł przez API
-- pobrać e-maile osób zgłaszających wydarzenia bez konta. Teraz e-mail widzą tylko personel (admin, moderator)
-- i właściciel danego wydarzenia.
--
-- Ta migracja jest DODAJĄCA: kolumna events.organizer_email zostaje na razie nietknięta, więc stary kod dalej działa.
-- KOLEJNOŚĆ WDROŻENIA: 1) ta migracja, 2) nowy kod formularza (czyta i zapisuje event_contacts),
-- 3) test, 4) dopiero potem migracja 0006 usuwająca starą kolumnę.
--
-- UWAGA (zależność): polityka INSERT dla anona sprawdza wiersz wydarzenia (status pending, source public) przez
-- podzapytanie. Gdybyś kiedyś zawęził odczyt tabeli events dla anona, trzeba tu dopisać zamiennik (np. funkcję RPC).

create table public.event_contacts (
  event_id uuid primary key references public.events (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  constraint event_contacts_email_check
    check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table public.event_contacts enable row level security;

-- Uprawnienia jawnie, niezależnie od domyślnych uprawnień Supabase: anon tylko dopisuje, nigdy nie czyta.
revoke all on public.event_contacts from anon, authenticated;
grant insert on public.event_contacts to anon;
grant select, insert, update, delete on public.event_contacts to authenticated;

create policy "Odczyt kontaktu: personel i właściciel" on public.event_contacts
  as permissive for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['admin'::text, 'moderator'::text]))
    or exists (select 1 from public.events e where e.id = event_contacts.event_id and e.created_by = auth.uid())
  );

create policy "Dodawanie kontaktu" on public.event_contacts
  as permissive for insert to anon, authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['admin'::text, 'moderator'::text]))
    or exists (
      select 1 from public.events e
      where e.id = event_contacts.event_id
        and (
          e.created_by = auth.uid()
          or (e.created_by is null and e.status = 'pending'::text and e.source = 'public'::text)
        )
    )
  );

create policy "Edycja kontaktu" on public.event_contacts
  as permissive for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['admin'::text, 'moderator'::text]))
    or exists (select 1 from public.events e where e.id = event_contacts.event_id and e.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['admin'::text, 'moderator'::text]))
    or exists (select 1 from public.events e where e.id = event_contacts.event_id and e.created_by = auth.uid())
  );

create policy "Usuwanie kontaktu" on public.event_contacts
  as permissive for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['admin'::text, 'moderator'::text]))
    or exists (select 1 from public.events e where e.id = event_contacts.event_id and e.created_by = auth.uid())
  );

-- Przeniesienie istniejących adresów. Wiersze, których adres nie spełnia ograniczenia (literówki), są pomijane
-- i zostają w events.organizer_email do czasu migracji 0006 (patrz zapytanie kontrolne w opisie 0006).
insert into public.event_contacts (event_id, email)
select id, btrim(organizer_email)
from public.events
where nullif(btrim(organizer_email), '') is not null
  and char_length(btrim(organizer_email)) <= 254
  and btrim(organizer_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
on conflict (event_id) do nothing;

-- 0000_baseline.sql
-- Stan bazy Evently odtworzony z zapytań katalogowych (dump nr 1 i 3), NIE z pg_dump.
-- Odzwierciedla bazę PRZED naprawą widoków organizatora (ta jest w 0001_organizer_views.sql).
-- Pomija to, co zarządza Supabase: schematy auth/storage, role, event triggery (ensure_rls i pg_graphql/pg_cron/pg_net).
-- Uprawnienia domyślne (anon/authenticated/service_role mają wszystko na public.*) pochodzą z default privileges Supabase;
-- poniżej jawnie jest tylko odebranie anon pełnego SELECT na events (kolumny: patrz GRANT na końcu).

-- =========================================================
-- TABELE
-- =========================================================

create table public.profiles (
  id uuid not null,
  created_at timestamptz default now(),
  username text,
  full_name text,
  avatar_url text,
  city text,
  bio text,
  role text default 'user'::text,
  organization_name text,
  phone text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users (id),
  constraint profiles_username_key unique (username),
  constraint role_check check (role = any (array['admin'::text, 'moderator'::text, 'organizer'::text, 'user'::text]))
);

create table public.events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  title text not null,
  slug text not null,
  description text,
  short_description text,
  start_date timestamptz not null,
  end_date timestamptz,
  city text not null,
  address text,
  venue_name text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  country_code character(2) default 'PL'::bpchar,
  category text not null,
  tags text[],
  cover_image_url text,
  is_free boolean default true,
  price_from numeric(8,2),
  ticket_url text,
  organizer_name text,
  website_url text,
  status text default 'draft'::text,
  is_featured boolean default false,
  view_count integer default 0,
  save_count integer default 0,
  image_url text,
  schedule jsonb default '[]'::jsonb,
  organizer_email text,
  schedule_type text not null default 'needs_review'::text,
  location_notes text,
  deleted_at timestamptz,
  source text default 'admin'::text,
  created_by uuid,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  constraint events_pkey primary key (id),
  constraint events_created_by_fkey foreign key (created_by) references auth.users (id),
  constraint events_schedule_type_check check (schedule_type = any (array['range'::text, 'per_day'::text, 'recurring'::text, 'needs_review'::text])),
  constraint events_slug_key unique (slug)
);

create table public.event_dates (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  date date not null,
  start_time time,
  end_time time,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint event_dates_pkey primary key (id),
  constraint event_dates_event_id_fkey foreign key (event_id) references public.events (id) on delete cascade
);

create table public.event_attendees (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid,
  event_id uuid,
  constraint event_attendees_pkey primary key (id),
  constraint event_attendees_user_id_event_id_key unique (user_id, event_id),
  constraint event_attendees_event_id_fkey foreign key (event_id) references public.events (id) on delete cascade,
  constraint event_attendees_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);

-- Nieużywana w kodzie aplikacji (stan na 2026-10-01), RLS włączone bez polityk = nikt nie ma dostępu.
create table public.saved_events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid,
  event_id uuid,
  constraint saved_events_pkey primary key (id),
  constraint saved_events_user_id_event_id_key unique (user_id, event_id),
  constraint saved_events_event_id_fkey foreign key (event_id) references public.events (id) on delete cascade,
  constraint saved_events_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);

-- =========================================================
-- INDEKSY (poza tymi tworzonymi przez PRIMARY KEY / UNIQUE powyżej)
-- =========================================================

create index idx_event_dates_date on public.event_dates using btree (date);
create index idx_event_dates_next on public.event_dates using btree (event_id, starts_at);
create index events_deleted_at_idx on public.events using btree (deleted_at);
create unique index events_slug_unique_active on public.events using btree (slug) where (deleted_at is null);

-- =========================================================
-- FUNKCJE
-- =========================================================

create or replace function public.archive_past_events()
 returns void
 language plpgsql
as $function$
begin
  update public.events e
  set status = 'archived'
  where status = 'published'
    and not exists (
      select 1 from public.event_dates ed
      where ed.event_id = e.id
        and coalesce(
              (ed.date + ed.end_time)::timestamptz,
              (ed.date + time '23:59:59')::timestamptz
            ) >= now()
    );
end;
$function$;

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.increment_view_count(p_event_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update events
  set
    view_count = view_count + 1,
    first_viewed_at = coalesce(first_viewed_at, now()),
    last_viewed_at = now()
  where id = p_event_id;
end;
$function$;

create or replace function public.prevent_self_role_change()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  if auth.role() != 'service_role' and NEW.role is distinct from OLD.role then
    NEW.role := OLD.role;
  end if;
  return NEW;
end;
$function$;

create or replace function public.purge_trash()
 returns void
 language plpgsql
 security definer
as $function$
begin
  delete from events
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
end;
$function$;

create or replace function public.replace_event_dates(p_event_id uuid, p_dates jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_created_by uuid;
  v_role text;
begin
  select created_by into v_created_by from events where id = p_event_id;
  if v_created_by is null then
    raise exception 'Wydarzenie nie istnieje';
  end if;

  select role into v_role from profiles where id = auth.uid();

  if auth.uid() is distinct from v_created_by and coalesce(v_role, '') not in ('admin', 'moderator') then
    raise exception 'Brak uprawnień do edycji terminów tego wydarzenia';
  end if;

  delete from event_dates where event_id = p_event_id;

  insert into event_dates (event_id, date, start_time, end_time, starts_at)
  select
    p_event_id,
    r.date::date,
    nullif(r.start_time, '')::time,
    nullif(r.end_time, '')::time,
    r.starts_at::timestamp
  from jsonb_to_recordset(p_dates) as r(date text, start_time text, end_time text, starts_at text);
end;
$function$;

-- rls_auto_enable() jest funkcją event triggera "ensure_rls" zarządzanego przez ustawienia projektu Supabase
-- (automatyczne włączanie RLS na nowych tabelach) — nie odtwarzamy jej tutaj.

-- =========================================================
-- TRIGGERY
-- =========================================================

create trigger trg_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- WIDOKI (stan sprzed 0001: published_events_with_next_date bez created_by,
--         public_organizer_profiles jako security_invoker)
-- =========================================================

create view public.published_events_with_next_date
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
  d.starts_at as next_starts_at
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

create view public.public_organizer_profiles
with (security_invoker = true) as
select id, organization_name, avatar_url
from public.profiles;

create view public.public_events
with (security_invoker = true) as
select
  id, created_at, updated_at, title, slug, description, short_description, start_date, end_date,
  city, address, venue_name, latitude, longitude, country_code, category, tags, cover_image_url,
  is_free, price_from, ticket_url, organizer_name, website_url, status, is_featured, view_count,
  save_count, image_url, schedule, schedule_type, location_notes, deleted_at, source, created_by
from public.events;

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_dates enable row level security;
alter table public.event_attendees enable row level security;
alter table public.saved_events enable row level security;

-- profiles
create policy "Users can read own profile" on public.profiles
  as permissive for select to authenticated
  using (auth.uid() = id);

create policy "users can update own profile" on public.profiles
  as permissive for update to public
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- events
create policy "Publiczny odczyt wydarzeń" on public.events
  as permissive for select to public
  using (true);

create policy "Dodawanie wydarzeń" on public.events
  as permissive for insert to public
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
    or (created_by = auth.uid() and status = 'published'::text and source = 'organizer'::text
        and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'organizer'::text))
    or (created_by is null and status = 'pending'::text and source = 'public'::text)
  );

create policy "Edytowanie wydarzen" on public.events
  as permissive for update to public
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
    or (created_by = auth.uid()
        and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'organizer'::text))
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
    or (created_by = auth.uid()
        and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'organizer'::text))
  );

create policy "Usuwanie wydarzen" on public.events
  as permissive for delete to public
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
  );

-- event_dates
create policy "Publiczny odczyt terminów" on public.event_dates
  as permissive for select to public
  using (true);

create policy "Dodawanie terminów" on public.event_dates
  as permissive for insert to public
  with check (
    exists (
      select 1 from public.events
      where events.id = event_dates.event_id
        and (
          exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
          or events.created_by = auth.uid()
          or (events.created_by is null and events.status = 'pending'::text)
        )
    )
  );

create policy "Edytowanie terminów" on public.event_dates
  as permissive for update to public
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
  );

create policy "Usuwanie terminów" on public.event_dates
  as permissive for delete to public
  using (
    exists (
      select 1 from public.events
      where events.id = event_dates.event_id
        and (
          exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::text, 'moderator'::text]))
          or events.created_by = auth.uid()
        )
    )
  );

-- event_attendees
create policy "Anyone can view attendance" on public.event_attendees
  as permissive for select to anon, authenticated
  using (true);

create policy "Users can insert own attendance" on public.event_attendees
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own attendance" on public.event_attendees
  as permissive for delete to authenticated
  using (auth.uid() = user_id);

-- =========================================================
-- UPRAWNIENIA KOLUMNOWE: anon NIE ma pełnego SELECT na events (brak: organizer_email, first_viewed_at, last_viewed_at)
-- =========================================================

revoke select on public.events from anon;
grant select (
  address, category, city, country_code, cover_image_url, created_at, created_by, deleted_at,
  description, end_date, id, image_url, is_featured, is_free, latitude, location_notes, longitude,
  organizer_name, price_from, save_count, schedule, schedule_type, short_description, slug, source,
  start_date, status, tags, ticket_url, title, updated_at, venue_name, view_count, website_url
) on public.events to anon;

-- =========================================================
-- STORAGE: bucket event-images + polityki na storage.objects
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- UWAGA: mimo nazwy "authenticated uploads" polityka dotyczy roli public, czyli także anon.
create policy "Allow authenticated uploads 1o4y39n_0" on storage.objects
  as permissive for insert to public
  with check (bucket_id = 'event-images'::text);

create policy "Allow public read 1o4y39n_0" on storage.objects
  as permissive for select to public
  using (bucket_id = 'event-images'::text);

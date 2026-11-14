-- 0007_deleted_by.sql
-- S1: organizator może przywrócić z kosza tylko to, co sam tam przeniósł.
-- Wydarzeń usuniętych przez personel nie może wyciągnąć z kosza.

-- 1) Kto przeniósł wydarzenie do kosza
alter table public.events
  add column if not exists deleted_by uuid references auth.users (id) on delete set null;

-- 2) Trigger: pełna wersja funkcji
create or replace function public.protect_event_admin_columns()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  -- tylko zapytania z API; funkcje SECURITY DEFINER, service_role i SQL Editor przechodzą
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Zapis, kto przeniósł do kosza (dla wszystkich, także personelu)
  if tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      new.deleted_by := auth.uid();
    elsif new.deleted_at is null then
      new.deleted_by := null;
    else
      new.deleted_by := old.deleted_by;
    end if;
  end if;

  if public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_featured := false;
    new.view_count := 0;
    new.save_count := 0;
    new.first_viewed_at := null;
    new.last_viewed_at := null;
    new.deleted_by := null;
    return new;
  end if;

  new.is_featured := old.is_featured;
  new.view_count := old.view_count;
  new.save_count := old.save_count;
  new.first_viewed_at := old.first_viewed_at;
  new.last_viewed_at := old.last_viewed_at;
  new.source := old.source;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  -- Kosz (S1)
  if old.deleted_at is null and new.deleted_at is not null then
    -- przeniesienie do kosza: data zawsze "teraz" (bez cofania daty, które przyspieszałoby trwałe usunięcie)
    new.deleted_at := now();
  elsif old.deleted_at is not null
        and new.deleted_at is distinct from old.deleted_at
        and old.deleted_by is distinct from auth.uid() then
    raise exception 'To wydarzenie usunął administrator. Napisz do nas, jeśli chcesz je przywrócić.';
  elsif old.deleted_at is not null and new.deleted_at is not null then
    -- nadal w koszu: bez zmiany daty usunięcia
    new.deleted_at := old.deleted_at;
  end if;

  if new.status is distinct from old.status
     and new.status = 'published'
     and coalesce(old.status, '') not in ('published', 'archived') then
    new.status := old.status;
  end if;

  return new;
end;
$function$;
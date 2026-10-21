-- =====================================================================
-- Ops Epic Maker — Supabase setup
-- Run this once in the Supabase SQL editor of a fresh project.
--
-- Concept:
--  * profiles  — one row per auth user (role: admin/member, approved flag)
--  * epics     — saved epic drafts (full wizard state as jsonb)
--  * comments  — comment thread per epic
--  * The FIRST user ever created becomes admin and is auto-approved.
--    Everyone else starts unapproved until an admin activates them,
--    so a stranger who signs up via the public anon key sees nothing.
--  * The last remaining admin can never be demoted or deactivated.
-- =====================================================================

-- ---------- profiles ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  role         text not null default 'member' check (role in ('admin','member')),
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile for every new auth user.
-- First user ever -> admin + approved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  admin_exists boolean;
begin
  select exists(select 1 from public.profiles where role = 'admin') into admin_exists;
  insert into public.profiles (id, email, display_name, role, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when admin_exists then 'member' else 'admin' end,
    not admin_exists
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper predicates (security definer so RLS policies can use them).
create or replace function public.is_approved()
returns boolean language sql security definer stable set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and approved) $$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and approved) $$;

-- Never allow the last active admin to be demoted or deactivated.
create or replace function public.protect_last_admin()
returns trigger language plpgsql
as $$
begin
  if old.role = 'admin' and old.approved and (new.role <> 'admin' or new.approved = false) then
    if (select count(*) from public.profiles where role = 'admin' and approved) <= 1 then
      raise exception 'Der letzte aktive Admin kann nicht entfernt werden.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_last_admin
  before update on public.profiles
  for each row execute function public.protect_last_admin();

alter table public.profiles enable row level security;

create policy "profiles: read own or approved team"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_approved());

create policy "profiles: admin updates"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- epics ----------
create table public.epics (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Ohne Titel',
  data       jsonb not null,
  -- Entwurf (Standard) oder Abgeschlossen
  status     text not null default 'entwurf' check (status in ('entwurf', 'abgeschlossen')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.epics enable row level security;

create policy "epics: team read"
  on public.epics for select to authenticated
  using (public.is_approved());

create policy "epics: team insert"
  on public.epics for insert to authenticated
  with check (public.is_approved() and created_by = auth.uid());

create policy "epics: team update"
  on public.epics for update to authenticated
  using (public.is_approved())
  with check (public.is_approved());

create policy "epics: owner or admin delete"
  on public.epics for delete to authenticated
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

-- ---------- comments ----------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  epic_id    uuid not null references public.epics(id) on delete cascade,
  author     uuid not null references public.profiles(id),
  body       text not null,
  -- Bereichs-Zuordnung (Panel-ID des Templates) und Antworten (1 Ebene)
  section    text not null default 'epic',
  parent_id  uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index comments_epic_idx on public.comments (epic_id, created_at);
create index comments_epic_section_idx on public.comments (epic_id, section);

alter table public.comments enable row level security;

create policy "comments: team read"
  on public.comments for select to authenticated
  using (public.is_approved());

create policy "comments: team insert"
  on public.comments for insert to authenticated
  with check (public.is_approved() and author = auth.uid());

create policy "comments: own update"
  on public.comments for update to authenticated
  using (public.is_approved() and author = auth.uid())
  with check (public.is_approved() and author = auth.uid());

create policy "comments: own or admin delete"
  on public.comments for delete to authenticated
  using (public.is_approved() and (author = auth.uid() or public.is_admin()));

-- ---------- avatars (storage) & self-service profile updates ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

create policy "avatars: upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg' and public.is_approved());

create policy "avatars: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')
  with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

-- Nutzer dürfen NUR display_name/avatar_url des eigenen Profils ändern
-- (die profiles-Update-Policy bleibt Admins vorbehalten; eine Self-Update-
-- Policy würde auch role/approved freigeben).
create or replace function public.update_own_profile(new_display_name text default null, new_avatar_url text default null)
returns void
language sql security definer set search_path = public
as $$
  update public.profiles
     set display_name = coalesce(new_display_name, display_name),
         avatar_url   = coalesce(new_avatar_url, avatar_url)
   where id = auth.uid();
$$;

revoke execute on function public.update_own_profile(text, text) from public, anon;
grant execute on function public.update_own_profile(text, text) to authenticated;

-- ---------- app settings ----------
-- Zentrale App-Einstellungen (z. B. KI-Modell). Lesen: freigeschaltetes Team,
-- Schreiben: nur Admins.
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.app_settings enable row level security;

create policy "settings: team read"
  on public.app_settings for select to authenticated
  using (public.is_approved());

create policy "settings: admin insert"
  on public.app_settings for insert to authenticated
  with check (public.is_admin());

create policy "settings: admin update"
  on public.app_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value)
values ('ai_model', '"claude-haiku-4-5"'::jsonb)
on conflict (key) do nothing;

-- ---------- ai_requests: Protokoll der KI-Aufrufe (Admin-Statistik) ----------
create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_requests enable row level security;

-- Eigene Aufrufe protokollieren (geschieht serverseitig in der Edge Function
-- mit dem JWT des Aufrufers).
create policy "ai_requests_insert_own" on public.ai_requests
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());

-- Nur Admins lesen die Statistik.
create policy "ai_requests_select_admin" on public.ai_requests
  for select to authenticated
  using (public.is_admin());

-- ---------- comment_reads: Lese-Status für Ungelesen-Anzeigen ----------
create table public.comment_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  epic_id uuid not null references public.epics(id) on delete cascade,
  section text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, epic_id, section)
);

alter table public.comment_reads enable row level security;

-- Jede Person verwaltet nur den eigenen Lese-Status
create policy "comment_reads_own" on public.comment_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_approved());

-- ---------- okrs: Team-OKRs, optional von Epics referenziert ----------
create table public.okrs (
  id uuid primary key default gen_random_uuid(),
  objective text not null,
  description text not null default '',
  key_results jsonb not null default '[]'::jsonb,
  quarter text not null,
  status text not null default 'aktiv' check (status in ('aktiv', 'archiviert')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.okrs enable row level security;

-- Alle freigeschalteten Teammitglieder lesen und pflegen OKRs
create policy "okrs_select" on public.okrs
  for select to authenticated
  using (public.is_approved());

create policy "okrs_insert" on public.okrs
  for insert to authenticated
  with check (public.is_approved() and created_by = auth.uid());

create policy "okrs_update" on public.okrs
  for update to authenticated
  using (public.is_approved())
  with check (public.is_approved());

-- Löschen nur durch Erstellende oder Admins
create policy "okrs_delete" on public.okrs
  for delete to authenticated
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

-- ---------- todos: lose Themen-/Todo-Liste des Teams ----------
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "todos_select" on public.todos
  for select to authenticated
  using (public.is_approved());

create policy "todos_insert" on public.todos
  for insert to authenticated
  with check (public.is_approved() and created_by = auth.uid());

create policy "todos_update" on public.todos
  for update to authenticated
  using (public.is_approved())
  with check (public.is_approved());

-- Löschen nur durch Erstellende oder Admins (aktuell ohne UI, für später)
create policy "todos_delete" on public.todos
  for delete to authenticated
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

-- ---------- realtime: Live-Updates an alle Clients ----------
alter publication supabase_realtime add table public.epics;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.ai_requests;
alter publication supabase_realtime add table public.okrs;
alter publication supabase_realtime add table public.todos;

-- ---------- hardening (per Supabase security advisor) ----------
alter function public.protect_last_admin() set search_path = public;

-- handle_new_user fires only as a trigger; nobody needs EXECUTE via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin/is_approved are evaluated inside RLS policies with the caller's
-- privileges, so `authenticated` must keep EXECUTE; `anon` does not need it.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_approved() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved() to authenticated;

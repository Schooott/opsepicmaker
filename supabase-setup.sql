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
  created_at timestamptz not null default now()
);

create index comments_epic_idx on public.comments (epic_id, created_at);

alter table public.comments enable row level security;

create policy "comments: team read"
  on public.comments for select to authenticated
  using (public.is_approved());

create policy "comments: team insert"
  on public.comments for insert to authenticated
  with check (public.is_approved() and author = auth.uid());

create policy "comments: own or admin delete"
  on public.comments for delete to authenticated
  using (public.is_approved() and (author = auth.uid() or public.is_admin()));

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

-- Milestone 1: organisations, membership, platform admins and the function catalog.
-- Every table has row-level security. Org isolation is enforced through the
-- helper functions below, which later tables reuse.

create type public.org_role as enum ('admin', 'facilitator');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  -- One credit is used when a session first moves from draft to lobby.
  session_credits integer not null default 0 check (session_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'facilitator',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_id_idx on public.org_members (user_id);

-- Super admins (Moses). Kept in sync with SUPER_ADMIN_EMAILS by the server.
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- The business functions a deck can cover. Static catalog, seeded.
create table public.functions (
  slug text primary key,
  name text not null,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- security definer so policies can call these without recursing into RLS.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(target_org uuid, wanted public.org_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = (select auth.uid()) and role = wanted
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, public.org_role) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.platform_admins enable row level security;
alter table public.functions enable row level security;

-- organizations: members see their own org; only platform admins change orgs.
create policy "members and platform admins can read orgs"
  on public.organizations for select to authenticated
  using (public.is_org_member(id) or public.is_platform_admin());

create policy "platform admins can create orgs"
  on public.organizations for insert to authenticated
  with check (public.is_platform_admin());

create policy "platform admins can update orgs"
  on public.organizations for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform admins can delete orgs"
  on public.organizations for delete to authenticated
  using (public.is_platform_admin());

-- org_members: members see who else is in their org; org admins and platform
-- admins manage membership.
create policy "members can read their org's members"
  on public.org_members for select to authenticated
  using (public.is_org_member(org_id) or public.is_platform_admin());

create policy "org admins can add members"
  on public.org_members for insert to authenticated
  with check (public.has_org_role(org_id, 'admin') or public.is_platform_admin());

create policy "org admins can change members"
  on public.org_members for update to authenticated
  using (public.has_org_role(org_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(org_id, 'admin') or public.is_platform_admin());

create policy "org admins can remove members"
  on public.org_members for delete to authenticated
  using (public.has_org_role(org_id, 'admin') or public.is_platform_admin());

-- platform_admins: you can see your own row. Writes happen only with the
-- service role (which bypasses RLS).
create policy "users can see their own platform admin row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- functions: readable by everyone, including anonymous players.
create policy "anyone can read the function catalog"
  on public.functions for select to anon, authenticated
  using (true);

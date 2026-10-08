-- Milestone 2: decks, cases and the jobs log.
-- A deck belongs to an organisation. Library decks (org_id is null) are
-- shared templates, such as the default HR deck; facilitators copy them into
-- their own organisation before editing.

create type public.case_source as enum ('ai', 'manual', 'library');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  -- Light company context, used by the case generator.
  industry text not null default '' check (char_length(industry) <= 120),
  company_size text not null default '' check (char_length(company_size) <= 60),
  tools text[] not null default '{}',
  country text not null default 'Nigeria' check (char_length(country) <= 60),
  pain_points text not null default '' check (char_length(pain_points) <= 1000),
  -- Functions this deck covers, in display order.
  function_slugs text[] not null default '{}',
  copied_from uuid references public.decks (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decks_org_id_idx on public.decks (org_id);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  function_slug text not null references public.functions (slug),
  title text not null check (char_length(title) between 3 and 80),
  story text not null check (char_length(story) between 20 and 900),
  cost text not null default '' check (char_length(cost) <= 300),
  who_feels_it text not null default '' check (char_length(who_feels_it) <= 200),
  source public.case_source not null default 'manual',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cases_deck_id_idx on public.cases (deck_id, function_slug, position);

-- Background work (n8n jobs, or the same jobs run locally). Also an audit
-- trail of AI generation.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  type text not null,
  status public.job_status not null default 'queued',
  payload jsonb not null default '{}',
  result jsonb,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_org_id_idx on public.jobs (org_id, created_at desc);

create trigger decks_set_updated_at before update on public.decks
  for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases
  for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True for signed-in facilitators and admins, false for anonymous players.
create or replace function public.is_signed_in_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false;
$$;

create or replace function public.can_read_deck(target_deck uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.decks d
    where d.id = target_deck
      and (
        (d.org_id is null and public.is_signed_in_staff())
        or public.is_org_member(d.org_id)
        or public.is_platform_admin()
      )
  );
$$;

create or replace function public.can_edit_deck(target_deck uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.decks d
    where d.id = target_deck
      and (
        (d.org_id is not null and public.is_org_member(d.org_id))
        or public.is_platform_admin()
      )
  );
$$;

revoke execute on function public.can_read_deck(uuid) from public, anon;
revoke execute on function public.can_edit_deck(uuid) from public, anon;
grant execute on function public.can_read_deck(uuid) to authenticated;
grant execute on function public.can_edit_deck(uuid) to authenticated;
grant execute on function public.is_signed_in_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.decks enable row level security;
alter table public.cases enable row level security;
alter table public.jobs enable row level security;

-- decks: org members see and edit their org's decks; staff can read the
-- library; only platform admins change library decks.
create policy "staff can read their decks and the library"
  on public.decks for select to authenticated
  using (
    (org_id is null and public.is_signed_in_staff())
    or public.is_org_member(org_id)
    or public.is_platform_admin()
  );

create policy "members can create decks in their org"
  on public.decks for insert to authenticated
  with check (
    (org_id is not null and public.is_org_member(org_id))
    or public.is_platform_admin()
  );

create policy "members can update their org's decks"
  on public.decks for update to authenticated
  using ((org_id is not null and public.is_org_member(org_id)) or public.is_platform_admin())
  with check ((org_id is not null and public.is_org_member(org_id)) or public.is_platform_admin());

create policy "members can delete their org's decks"
  on public.decks for delete to authenticated
  using ((org_id is not null and public.is_org_member(org_id)) or public.is_platform_admin());

-- cases follow their deck.
create policy "readers of a deck can read its cases"
  on public.cases for select to authenticated
  using (public.can_read_deck(deck_id));

create policy "editors of a deck can add cases"
  on public.cases for insert to authenticated
  with check (public.can_edit_deck(deck_id));

create policy "editors of a deck can change cases"
  on public.cases for update to authenticated
  using (public.can_edit_deck(deck_id))
  with check (public.can_edit_deck(deck_id));

create policy "editors of a deck can delete cases"
  on public.cases for delete to authenticated
  using (public.can_edit_deck(deck_id));

-- jobs: org members can see and log their org's jobs. n8n writes results
-- back with the service role, which bypasses RLS.
create policy "members can read their org's jobs"
  on public.jobs for select to authenticated
  using (public.is_org_member(org_id) or public.is_platform_admin());

create policy "members can log jobs for their org"
  on public.jobs for insert to authenticated
  with check (public.is_org_member(org_id) and created_by = (select auth.uid()));

create policy "members can update jobs they started"
  on public.jobs for update to authenticated
  using (public.is_org_member(org_id) and created_by = (select auth.uid()))
  with check (public.is_org_member(org_id) and created_by = (select auth.uid()));

-- Milestone 6: the design check and per-team twists.

create table public.design_checks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  design_version public.design_version not null,
  -- [{ slot, kind, question }], hard errors only. Kept for the report.
  flags jsonb not null default '[]',
  source text not null default 'ai' check (source in ('ai', 'fallback')),
  created_at timestamptz not null default now()
);
create index design_checks_team_idx on public.design_checks (team_id, created_at);

create type public.twist_kind as enum ('operational', 'risk');

create table public.twists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  kind public.twist_kind not null default 'operational',
  content text not null check (char_length(content) between 10 and 400),
  -- Slots the twist most affects, to guide the coach and the judge.
  affects text[] not null default '{}',
  source text not null default 'ai' check (source in ('ai', 'bank')),
  created_at timestamptz not null default now()
);
create index twists_session_idx on public.twists (session_id);

alter table public.design_checks enable row level security;
alter table public.twists enable row level security;

create policy "staff and team players can read design checks"
  on public.design_checks for select to authenticated
  using (public.is_team_player(team_id) or public.is_team_staff(team_id));

-- Every player in the session can see every team's twist: they are read out
-- in the room and shown on the projector.
create policy "staff and players can read a session's twists"
  on public.twists for select to authenticated
  using (public.is_session_staff(session_id) or public.is_session_player(session_id));

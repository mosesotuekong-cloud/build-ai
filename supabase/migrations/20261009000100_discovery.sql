-- Milestone 4: the discovery scorecard, raised problems ("Bring your own
-- problem"), session-only cases, and the solo before-and-after checks.

-- ---------------------------------------------------------------------------
-- Discovery scorecard, on the design. Values come from lib/discovery/scorecard.ts.
-- ---------------------------------------------------------------------------
alter table public.designs
  add column impact smallint check (impact between 1 and 5),
  add column effort smallint check (effort between 1 and 5),
  add column frequency text check (frequency in ('daily', 'weekly', 'monthly', 'rarely')),
  add column volume_per_month integer check (volume_per_month is null or volume_per_month between 0 and 1000000),
  add column data_location text check (data_location in ('known', 'unsure')),
  add column data_access text check (data_access in ('yes', 'partly', 'no', 'unsure')),
  add column data_quality text check (data_quality in ('good', 'messy', 'unsure')),
  add column personal_data text check (personal_data in ('yes', 'no', 'unsure')),
  add column risks text[] not null default '{}',
  add column ai_kind text,
  add column platform_fit text;

-- ---------------------------------------------------------------------------
-- Cases a team writes for itself belong to one session and never change the deck.
-- ---------------------------------------------------------------------------
alter type public.case_source add value if not exists 'raised';
alter table public.cases add column session_id uuid references public.sessions (id) on delete cascade;
create index cases_session_id_idx on public.cases (session_id) where session_id is not null;

-- ---------------------------------------------------------------------------
-- Raised problems.
-- ---------------------------------------------------------------------------
create type public.idea_status as enum ('raised', 'designed');

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  what_happens text not null check (char_length(what_happens) between 10 and 600),
  who_feels_it text not null default '' check (char_length(who_feels_it) <= 200),
  frequency text check (frequency in ('daily', 'weekly', 'monthly', 'rarely')),
  status public.idea_status not null default 'raised',
  case_id uuid references public.cases (id) on delete set null,
  created_at timestamptz not null default now()
);
create index ideas_session_id_idx on public.ideas (session_id, created_at);

-- ---------------------------------------------------------------------------
-- Solo checks (the warm-up and final rounds). Card ids refer to the bank in
-- lib/checks/cards.ts. Scores are filled in at judging (milestone 7).
-- ---------------------------------------------------------------------------
create type public.check_kind as enum ('baseline', 'post');

create table public.individual_checks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  kind public.check_kind not null,
  card_id text not null,
  trigger text not null default '' check (char_length(trigger) <= 600),
  steps text not null default '' check (char_length(steps) <= 600),
  decision text not null default '' check (char_length(decision) <= 600),
  action text not null default '' check (char_length(action) <= 600),
  human text not null default '' check (char_length(human) <= 600),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  breakdown jsonb,
  total integer check (total is null or total between 0 and 100),
  ai_summary text,
  unique (player_id, kind)
);
create index individual_checks_session_idx on public.individual_checks (session_id, kind);

-- ---------------------------------------------------------------------------
-- RLS. Players write through the server (which checks membership); staff
-- read everything in their sessions; players read their own session's ideas
-- and their own checks.
-- ---------------------------------------------------------------------------
alter table public.ideas enable row level security;
alter table public.individual_checks enable row level security;

create policy "staff and players can read a session's raised problems"
  on public.ideas for select to authenticated
  using (public.is_session_staff(session_id) or public.is_session_player(session_id));

create policy "staff read checks; players read their own"
  on public.individual_checks for select to authenticated
  using (
    public.is_session_staff(session_id)
    or exists (select 1 from public.players p where p.id = player_id and p.user_id = (select auth.uid()))
  );

-- Players of a session can read its session-only cases (their own problems).
create policy "players can read their session's own cases"
  on public.cases for select to authenticated
  using (session_id is not null and public.is_session_player(session_id));

alter publication supabase_realtime add table public.ideas;

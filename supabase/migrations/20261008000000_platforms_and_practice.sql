-- Target platforms, plus the session tables needed for practice mode
-- ("Try it as a player"). Live sessions (milestone 3) extend these tables;
-- they are designed for both from the start.

-- ---------------------------------------------------------------------------
-- Target platforms. Slugs come from lib/config/platforms.ts.
-- ---------------------------------------------------------------------------

alter table public.organizations add column ai_stack text[] not null default '{}';
alter table public.decks add column target_platforms text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Sessions, teams, players
-- ---------------------------------------------------------------------------

create type public.session_mode as enum ('live', 'practice');
create type public.session_phase as enum (
  'draft', 'lobby', 'baseline_check', 'solving', 'twist', 'solving_after_twist',
  'prioritise', 'judging', 'reveal', 'post_check', 'commitments', 'report', 'closed'
);
create type public.design_version as enum ('before_twist', 'after_twist');
create type public.coach_role as enum ('team', 'coach');
create type public.coach_message_type as enum ('question', 'nudge', 'analogy', 'flag');
create type public.coach_trigger as enum ('asked', 'inline_idle', 'inline_flag');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete set null,
  mode public.session_mode not null default 'live',
  name text not null default '' check (char_length(name) <= 120),
  phase public.session_phase not null default 'draft',
  phase_started_at timestamptz,
  phase_duration_seconds integer check (phase_duration_seconds is null or phase_duration_seconds > 0),
  -- Hint tokens, coach and twist switches, check settings and so on.
  settings jsonb not null default '{}',
  target_platforms text[] not null default '{}',
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_org_id_idx on public.sessions (org_id, created_at desc);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  case_id uuid references public.cases (id) on delete set null,
  hint_tokens_remaining integer not null default 3 check (hint_tokens_remaining >= 0),
  hint_tokens_earned integer not null default 0 check (hint_tokens_earned >= 0),
  created_at timestamptz not null default now()
);
create index teams_session_id_idx on public.teams (session_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (session_id, user_id)
);
create index players_team_id_idx on public.players (team_id);
create index players_user_id_idx on public.players (user_id);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  version public.design_version not null default 'before_twist',
  trigger text not null default '' check (char_length(trigger) <= 600),
  steps text not null default '' check (char_length(steps) <= 600),
  decision text not null default '' check (char_length(decision) <= 600),
  action text not null default '' check (char_length(action) <= 600),
  human text not null default '' check (char_length(human) <= 600),
  name text not null default '' check (char_length(name) <= 80),
  hours_saved_per_month numeric(7, 1) check (hours_saved_per_month is null or hours_saved_per_month >= 0),
  tools text[] not null default '{}',
  systems text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (team_id, version)
);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  role public.coach_role not null,
  type public.coach_message_type,
  slot text,
  content text not null check (char_length(content) between 1 and 2000),
  trigger public.coach_trigger not null default 'asked',
  tokens_spent integer not null default 0 check (tokens_spent >= 0),
  token_earned_at timestamptz,
  player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now()
);
create index coach_messages_team_id_idx on public.coach_messages (team_id, created_at);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  design_version public.design_version not null,
  breakdown jsonb not null,
  total integer not null check (total between 0 and 100),
  ai_summary text not null default '',
  facilitator_override integer check (facilitator_override is null or facilitator_override between 0 and 100),
  final integer generated always as (coalesce(facilitator_override, total)) stored,
  created_at timestamptz not null default now()
);
create index scores_team_id_idx on public.scores (team_id, created_at desc);

-- One model answer per case, generated the first time a session reaches the
-- reveal (or a practice run finishes), then reused.
create table public.reference_solutions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases (id) on delete cascade,
  trigger text not null,
  steps text not null,
  decision text not null,
  action text not null,
  human text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create trigger sessions_set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger designs_set_updated_at before update on public.designs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Staff of the organisation that owns the session.
create or replace function public.is_session_staff(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = target_session
      and (public.is_org_member(s.org_id) or public.is_platform_admin())
  );
$$;

create or replace function public.is_session_player(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.session_id = target_session and p.user_id = (select auth.uid()) and p.left_at is null
  );
$$;

create or replace function public.is_team_player(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.team_id = target_team and p.user_id = (select auth.uid()) and p.left_at is null
  );
$$;

create or replace function public.is_team_staff(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team and public.is_session_staff(t.session_id)
  );
$$;

revoke execute on function public.is_session_staff(uuid) from public, anon;
revoke execute on function public.is_session_player(uuid) from public, anon;
revoke execute on function public.is_team_player(uuid) from public, anon;
revoke execute on function public.is_team_staff(uuid) from public, anon;
grant execute on function public.is_session_staff(uuid) to authenticated;
grant execute on function public.is_session_player(uuid) to authenticated;
grant execute on function public.is_team_player(uuid) to authenticated;
grant execute on function public.is_team_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- Writes that need trust (tokens, phases, scores, coach replies, model
-- answers) go through the server with the service role. Players only write
-- their own team's design.
-- ---------------------------------------------------------------------------

alter table public.sessions enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.designs enable row level security;
alter table public.coach_messages enable row level security;
alter table public.scores enable row level security;
alter table public.reference_solutions enable row level security;

create policy "staff and players can read a session"
  on public.sessions for select to authenticated
  using (public.is_session_staff(id) or public.is_session_player(id));

create policy "staff and players can read teams"
  on public.teams for select to authenticated
  using (public.is_session_staff(session_id) or public.is_session_player(session_id));

create policy "staff and players can read players"
  on public.players for select to authenticated
  using (public.is_session_staff(session_id) or public.is_session_player(session_id));

create policy "staff and team players can read designs"
  on public.designs for select to authenticated
  using (public.is_team_player(team_id) or public.is_team_staff(team_id));

create policy "team players can update their design"
  on public.designs for update to authenticated
  using (public.is_team_player(team_id))
  with check (public.is_team_player(team_id));

create policy "staff and team players can read coach messages"
  on public.coach_messages for select to authenticated
  using (public.is_team_player(team_id) or public.is_team_staff(team_id));

create policy "staff and team players can read scores"
  on public.scores for select to authenticated
  using (public.is_team_player(team_id) or public.is_team_staff(team_id));

-- Model answers are visible to staff who can read the case's deck. Players
-- see them through the server at the reveal.
create policy "staff can read model answers"
  on public.reference_solutions for select to authenticated
  using (
    public.is_signed_in_staff()
    and exists (select 1 from public.cases c where c.id = case_id and public.can_read_deck(c.deck_id))
  );

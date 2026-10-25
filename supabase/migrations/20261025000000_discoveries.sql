-- Quick discovery: the simple, self-serve way to use Builda (agreed
-- 2026-10-25). Someone picks a function, the team size and their tech stack,
-- writes or picks a challenge, works through the cards on one shared screen,
-- and leaves with a workflow PDF, an n8n file and an MCP tool. The AI then
-- asks follow-up questions and strengthens the design.
--
-- One row per discovery, owned by the person who started it (an anonymous
-- sign-in until they save it to an account). Players' names are kept here for
-- the screen only and never sent to the AI.

create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  function_slug text not null,
  players integer not null default 1 check (players between 1 and 8),
  player_names text[] not null default '{}',
  stack text[] not null default '{}',
  region text not null default 'uk',
  -- challenge | cards | results
  stage text not null default 'challenge' check (stage in ('challenge', 'cards', 'results')),
  -- { title, story, cost, who_feels_it, source: own | ai }
  challenge jsonb,
  -- AI suggestions offered for this discovery, so a refresh doesn't pay twice.
  suggestions jsonb,
  -- The cards: fix notes, the five slots, control, name, hours, systems.
  design jsonb not null default '{}'::jsonb,
  -- Worth it? { value 1–5, readiness, risk }
  rank jsonb not null default '{}'::jsonb,
  card integer not null default 0,
  -- The tool-neutral plan every export is compiled from.
  plan jsonb,
  plan_source text,
  -- Strengthen it: the AI's questions, the answers, and the result.
  questions jsonb,
  answers jsonb,
  strengthened jsonb,
  ai_units integer not null default 0,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discoveries_user_idx on public.discoveries (user_id, created_at desc);
create index discoveries_ip_idx on public.discoveries (ip_hash, created_at);

alter table public.discoveries enable row level security;

-- People see and delete their own discoveries. Every other write goes
-- through the server, which checks ownership and keeps the plan, the AI
-- results and the AI budget honest.
create policy "own discoveries: read" on public.discoveries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own discoveries: delete" on public.discoveries for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.discoveries from anon;
revoke insert, update on public.discoveries from authenticated;

-- AI spend for discoveries: a per-discovery cap and a daily total across all
-- discoveries. When either runs out the app switches to scripted replies.
create table public.discovery_ai_days (
  day date primary key,
  units integer not null default 0
);
alter table public.discovery_ai_days enable row level security;
revoke all on public.discovery_ai_days from anon, authenticated;

create or replace function public.spend_discovery_ai(target uuid, units integer, per_discovery integer, daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  spent integer;
begin
  if units < 1 then
    return true;
  end if;
  update public.discoveries set ai_units = ai_units + spend_discovery_ai.units
    where id = target and ai_units + spend_discovery_ai.units <= per_discovery;
  if not found then
    return false;
  end if;
  insert into public.discovery_ai_days (day, units) values (current_date, 0) on conflict (day) do nothing;
  update public.discovery_ai_days set units = units + spend_discovery_ai.units
    where day = current_date and discovery_ai_days.units + spend_discovery_ai.units <= daily_limit
    returning discovery_ai_days.units into spent;
  if spent is null then
    -- Today's total is spent; give the discovery its units back.
    update public.discoveries set ai_units = greatest(0, ai_units - spend_discovery_ai.units) where id = target;
    return false;
  end if;
  return true;
end;
$$;

revoke execute on function public.spend_discovery_ai(uuid, integer, integer, integer) from public, anon, authenticated;

-- Milestone 8: blueprints. One per team: the tool-neutral plan made from the
-- team's final design at the reveal. The plan is the source of truth; the
-- n8n starter workflow and build guides are compiled from it on download, so
-- no compiled file is stored.

create table public.blueprints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id uuid not null unique references public.teams (id) on delete cascade,
  design_version public.design_version not null,
  -- The design's updated_at when the plan was made, so a changed design
  -- (practice runs can be reopened) gets a fresh plan.
  design_updated_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  plan jsonb,
  source text check (source in ('ai', 'rules')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blueprints_session_idx on public.blueprints (session_id);
create trigger blueprints_set_updated_at before update on public.blueprints
  for each row execute function public.set_updated_at();

-- Read by the team's players and the session's staff. Written only by the
-- server (service role).
alter table public.blueprints enable row level security;
create policy "staff and team players can read blueprints"
  on public.blueprints for select to authenticated
  using (public.is_session_staff(session_id) or public.is_team_player(team_id));

alter publication supabase_realtime add table public.blueprints;

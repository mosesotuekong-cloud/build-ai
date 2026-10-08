-- Milestone 7: judging (in the background, with progress), the AI's
-- discovery assessment, and commitments.

-- Score rows exist from the moment judging starts, so progress can be shown.
alter table public.scores
  add column status text not null default 'done' check (status in ('pending', 'done', 'failed')),
  add column assessment jsonb,
  alter column breakdown drop not null,
  alter column total drop not null;
alter table public.scores drop constraint if exists scores_total_check;
alter table public.scores add constraint scores_total_check check (total is null or total between 0 and 100);
create unique index scores_one_per_team_version_idx on public.scores (team_id, design_version);

alter publication supabase_realtime add table public.scores;
alter table public.scores replica identity full;

-- One commitment per team: an owner, a first step and a due date.
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id uuid not null unique references public.teams (id) on delete cascade,
  owner_name text not null check (char_length(owner_name) between 1 and 80),
  -- Optional. Personal data: stays in our database and never goes to the AI.
  owner_email text check (owner_email is null or owner_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  first_step text not null check (char_length(first_step) between 5 and 300),
  due_date date not null,
  follow_up_status text not null default 'queued' check (follow_up_status in ('queued', 'sent', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commitments_session_idx on public.commitments (session_id);
create trigger commitments_set_updated_at before update on public.commitments
  for each row execute function public.set_updated_at();

alter table public.commitments enable row level security;
create policy "staff and team players can read commitments"
  on public.commitments for select to authenticated
  using (public.is_session_staff(session_id) or public.is_team_player(team_id));

alter publication supabase_realtime add table public.commitments;

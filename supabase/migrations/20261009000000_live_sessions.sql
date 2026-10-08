-- Milestone 3: live sessions. Join codes, Realtime, and the server-only
-- functions that phase changes rely on.

-- A short code players type to join. Unique among sessions that are still open.
alter table public.sessions add column join_code text check (join_code ~ '^[A-Z2-9]{6}$');
create unique index sessions_open_join_code_idx on public.sessions (join_code) where phase <> 'closed' and join_code is not null;

-- Live updates for the facilitator console, presenter screen and phones.
-- Realtime applies the same RLS policies as normal reads.
alter publication supabase_realtime add table public.sessions, public.teams, public.players, public.designs, public.coach_messages;
-- Updates need the full row so filters and RLS can be evaluated.
alter table public.sessions replica identity full;
alter table public.teams replica identity full;
alter table public.players replica identity full;
alter table public.designs replica identity full;

-- Uses one session credit. Returns the credits left, or -1 if there were none.
create or replace function public.consume_session_credit(target_org uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.organizations set session_credits = session_credits - 1
    where id = target_org and session_credits >= 1 and is_active
    returning session_credits
  )
  select coalesce((select session_credits from updated), -1);
$$;

-- Gives every team in a session extra hint tokens (the twist bonus).
create or replace function public.add_session_tokens(target_session uuid, amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.teams set hint_tokens_remaining = hint_tokens_remaining + greatest(amount, 0)
  where session_id = target_session;
$$;

-- Saves each team's pre-twist design and starts an after-twist copy that the
-- team keeps editing.
create or replace function public.snapshot_designs_for_twist(target_session uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.designs (team_id, version, trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems)
  select d.team_id, 'after_twist', d.trigger, d.steps, d.decision, d.action, d.human, d.name, d.hours_saved_per_month, d.tools, d.systems
  from public.designs d
  join public.teams t on t.id = d.team_id
  where t.session_id = target_session and d.version = 'before_twist'
  on conflict (team_id, version) do nothing;
$$;

revoke execute on function public.consume_session_credit(uuid) from public, anon, authenticated;
revoke execute on function public.add_session_tokens(uuid, integer) from public, anon, authenticated;
revoke execute on function public.snapshot_designs_for_twist(uuid) from public, anon, authenticated;
grant execute on function public.consume_session_credit(uuid) to service_role;
grant execute on function public.add_session_tokens(uuid, integer) to service_role;
grant execute on function public.snapshot_designs_for_twist(uuid) to service_role;

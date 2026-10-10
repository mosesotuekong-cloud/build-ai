-- Milestone 9.6: the four-step method (Fix → Design → Control → Rank).
--
-- Fix: before designing, teams say what they would stop, merge or simplify
--      (Lean ECRS). Stored on the design.
-- Control: the human slot gains an oversight level: a person is in the loop
--      (approves every case), on the loop (watches, steps in on exceptions),
--      or out of the loop (fully automatic, low risk only).
-- Rank: three taps (value, readiness, risk) replace the long scorecard. The
--      old scorecard columns stay so earlier sessions still read correctly.

alter type public.session_phase add value if not exists 'fix' after 'baseline_check';

alter table public.designs
  add column fix jsonb not null default '{}',
  add column oversight text check (oversight in ('in', 'on', 'out')),
  add column readiness text check (readiness in ('ready', 'partly', 'not_yet')),
  add column risk_level text check (risk_level in ('low', 'medium', 'high'));

-- The twist copy now carries the Fix answers and the oversight level too.
create or replace function public.snapshot_designs_for_twist(target_session uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.designs (team_id, version, trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems, fix, oversight)
  select d.team_id, 'after_twist', d.trigger, d.steps, d.decision, d.action, d.human, d.name, d.hours_saved_per_month, d.tools, d.systems, d.fix, d.oversight
  from public.designs d
  join public.teams t on t.id = d.team_id
  where t.session_id = target_session and d.version = 'before_twist'
  on conflict (team_id, version) do nothing;
$$;

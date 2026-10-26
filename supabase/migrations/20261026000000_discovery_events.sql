-- Phase 1 (deploy and validate, agreed 2026-10-26): measure whether people
-- finish a discovery, how long the first useful output takes, whether the
-- exports are valid, and whether people found it useful.
--
-- One row per thing that happened in a discovery. Written only by the server
-- (service role); read only by the super admin's pilot dashboard. No content
-- of the discovery is copied here, only what happened and small numbers.

create table public.discovery_events (
  id bigint generated always as identity primary key,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  -- started | challenge_chosen | built | strengthened | downloaded | feedback
  kind text not null check (kind in ('started', 'challenge_chosen', 'built', 'strengthened', 'downloaded', 'feedback')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index discovery_events_kind_idx on public.discovery_events (kind, created_at desc);
create index discovery_events_discovery_idx on public.discovery_events (discovery_id);

alter table public.discovery_events enable row level security;
revoke all on public.discovery_events from anon, authenticated;

-- "Was this useful?": the latest answer, kept on the discovery so the screen
-- remembers it. { useful: 1–5, comment, at }
alter table public.discoveries add column feedback jsonb;

-- Milestone 9.5: the no-sign-in demo. A visitor gets an anonymous sign-in
-- and a private sandbox organisation that deletes itself after 24 hours.
-- Live AI in a sandbox draws on a small budget; when it runs out the app
-- uses scripted replies.

alter table public.organizations
  add column is_demo boolean not null default false,
  add column demo_expires_at timestamptz,
  -- AI units left for this sandbox (roughly one per AI call).
  add column demo_ai_units integer not null default 0 check (demo_ai_units >= 0),
  add constraint organizations_demo_expiry check (not is_demo or demo_expires_at is not null);
create index organizations_demo_expiry_idx on public.organizations (demo_expires_at) where is_demo;

-- One row per sandbox start, for the per-IP limit. Only a salted hash of
-- the IP address is kept, never the address itself.
create table public.demo_starts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  org_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index demo_starts_ip_idx on public.demo_starts (ip_hash, created_at desc);

-- AI units spent across all sandboxes per day, for the daily cap.
create table public.demo_ai_days (
  day date primary key,
  units integer not null default 0
);

alter table public.demo_starts enable row level security;
alter table public.demo_ai_days enable row level security;
-- No policies: only the server (service role) reads or writes these.

-- Spends AI units for a sandbox if both its own budget and today's total
-- allow it. Returns true when the live AI may be used.
create or replace function public.spend_demo_ai(target_org uuid, units integer, daily_limit integer)
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
  insert into public.demo_ai_days (day, units) values (current_date, 0) on conflict (day) do nothing;
  update public.demo_ai_days set units = units + spend_demo_ai.units
    where day = current_date and demo_ai_days.units + spend_demo_ai.units <= daily_limit
    returning demo_ai_days.units into spent;
  if spent is null then
    return false;
  end if;
  update public.organizations set demo_ai_units = demo_ai_units - spend_demo_ai.units
    where id = target_org and is_demo and demo_ai_units >= spend_demo_ai.units;
  if not found then
    -- Give today's units back; the sandbox's own budget is spent.
    update public.demo_ai_days set units = greatest(0, demo_ai_days.units - spend_demo_ai.units) where day = current_date;
    return false;
  end if;
  return true;
end;
$$;

-- Deletes expired sandboxes (everything in them cascades) and their
-- anonymous visitors' memberships. Returns how many were removed.
create or replace function public.purge_expired_demos()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.organizations where is_demo and demo_expires_at < now() returning id
  )
  select count(*)::integer from gone;
$$;

revoke execute on function public.spend_demo_ai(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.purge_expired_demos() from public, anon, authenticated;
grant execute on function public.spend_demo_ai(uuid, integer, integer) to service_role;
grant execute on function public.purge_expired_demos() to service_role;

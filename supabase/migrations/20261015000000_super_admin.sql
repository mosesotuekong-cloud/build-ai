-- Milestone 10: the super admin console. Every change to an organisation's
-- session credits is recorded with who made it and why (billing is manual).

create table public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null default '' check (char_length(reason) <= 200),
  balance_after integer not null check (balance_after >= 0),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_grants_org_idx on public.credit_grants (org_id, created_at desc);

alter table public.credit_grants enable row level security;
create policy "platform admins can read credit grants"
  on public.credit_grants for select to authenticated
  using (public.is_platform_admin());

-- Adds (or removes) credits in one step, never below zero, and records it.
-- Returns the new balance, or -1 if the change would go below zero.
create or replace function public.grant_session_credits(target_org uuid, amount integer, reason text, granted_by uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  balance integer;
begin
  update public.organizations set session_credits = session_credits + amount
    where id = target_org and session_credits + amount >= 0
    returning session_credits into balance;
  if balance is null then
    return -1;
  end if;
  insert into public.credit_grants (org_id, amount, reason, balance_after, granted_by)
    values (target_org, amount, coalesce(reason, ''), balance, granted_by);
  return balance;
end;
$$;

revoke execute on function public.grant_session_credits(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.grant_session_credits(uuid, integer, text, uuid) to service_role;

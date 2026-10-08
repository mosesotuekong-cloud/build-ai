-- Atomic hint-token spending (server only) and a safe way for org admins to
-- set their organisation's AI tool stack.

-- Spends tokens if the team has enough. Returns the new balance, or -1 if
-- the team cannot afford it. Only the service role may call it.
create or replace function public.spend_hint_tokens(target_team uuid, amount integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.teams
    set hint_tokens_remaining = hint_tokens_remaining - amount
    where id = target_team and amount >= 0 and hint_tokens_remaining >= amount
    returning hint_tokens_remaining
  )
  select coalesce((select hint_tokens_remaining from updated), -1);
$$;

-- Gives tokens back (a refund, the twist bonus, or earn-back).
create or replace function public.add_hint_tokens(target_team uuid, amount integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.teams
  set hint_tokens_remaining = hint_tokens_remaining + greatest(amount, 0)
  where id = target_team
  returning hint_tokens_remaining;
$$;

revoke execute on function public.spend_hint_tokens(uuid, integer) from public, anon, authenticated;
revoke execute on function public.add_hint_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.spend_hint_tokens(uuid, integer) to service_role;
grant execute on function public.add_hint_tokens(uuid, integer) to service_role;

-- Org admins (and platform admins) can set the AI tool stack, and nothing
-- else on the organisation row.
create or replace function public.set_org_ai_stack(target_org uuid, stack text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.has_org_role(target_org, 'admin') or public.is_platform_admin()) then
    raise exception 'Only organisation admins can change the AI tool stack' using errcode = '42501';
  end if;
  update public.organizations set ai_stack = coalesce(stack, '{}') where id = target_org;
end;
$$;

revoke execute on function public.set_org_ai_stack(uuid, text[]) from public, anon;
grant execute on function public.set_org_ai_stack(uuid, text[]) to authenticated;

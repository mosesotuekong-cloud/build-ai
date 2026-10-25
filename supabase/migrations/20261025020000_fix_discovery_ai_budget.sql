-- Fix: spend_discovery_ai failed on every call with "column reference
-- "units" is ambiguous" (the parameter and the column share a name), so
-- every discovery silently fell back to scripted AI replies. Every column
-- reference is now qualified with its table.
create or replace function public.spend_discovery_ai(target uuid, units integer, per_discovery integer, daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  spent integer;
begin
  if spend_discovery_ai.units < 1 then
    return true;
  end if;
  update public.discoveries d set ai_units = d.ai_units + spend_discovery_ai.units
    where d.id = spend_discovery_ai.target and d.ai_units + spend_discovery_ai.units <= spend_discovery_ai.per_discovery;
  if not found then
    return false;
  end if;
  insert into public.discovery_ai_days (day, units) values (current_date, 0) on conflict (day) do nothing;
  update public.discovery_ai_days a set units = a.units + spend_discovery_ai.units
    where a.day = current_date and a.units + spend_discovery_ai.units <= spend_discovery_ai.daily_limit
    returning a.units into spent;
  if spent is null then
    -- Today's total is spent; give the discovery its units back.
    update public.discoveries d set ai_units = greatest(0, d.ai_units - spend_discovery_ai.units) where d.id = spend_discovery_ai.target;
    return false;
  end if;
  return true;
end;
$$;

revoke execute on function public.spend_discovery_ai(uuid, integer, integer, integer) from public, anon, authenticated;

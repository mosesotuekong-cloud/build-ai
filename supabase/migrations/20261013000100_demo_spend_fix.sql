-- The first version of spend_demo_ai had a parameter named like a column
-- ("units"), which Postgres refused as ambiguous. Same behaviour, clearer names.

drop function if exists public.spend_demo_ai(uuid, integer, integer);

create function public.spend_demo_ai(target_org uuid, amount integer, daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  spent integer;
begin
  if amount < 1 then
    return true;
  end if;
  insert into public.demo_ai_days as d (day, units) values (current_date, 0) on conflict (day) do nothing;
  update public.demo_ai_days as d set units = d.units + amount
    where d.day = current_date and d.units + amount <= daily_limit
    returning d.units into spent;
  if spent is null then
    return false;
  end if;
  update public.organizations as o set demo_ai_units = o.demo_ai_units - amount
    where o.id = target_org and o.is_demo and o.demo_ai_units >= amount;
  if not found then
    -- Give today's units back; the sandbox's own budget is spent.
    update public.demo_ai_days as d set units = greatest(0, d.units - amount) where d.day = current_date;
    return false;
  end if;
  return true;
end;
$$;

revoke execute on function public.spend_demo_ai(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.spend_demo_ai(uuid, integer, integer) to service_role;

-- Milestone 5: the inline coach and coin earn-back.

-- At most one inline "you haven't started this slot yet" question per slot
-- per team, even when several phones ask at once.
create unique index coach_messages_one_inline_per_slot_idx
  on public.coach_messages (team_id, slot)
  where trigger = 'inline_idle' and role = 'coach';

-- Earns a team one hint token back for acting on a coach message. Atomic:
-- each message pays out at most once, and the team never earns more than
-- `cap` in a session. Returns the team's new token balance, or -1 if nothing
-- was earned. Only the service role may call it.
create or replace function public.earn_hint_token(target_team uuid, target_message uuid, cap integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed uuid;
  balance integer;
begin
  update public.coach_messages
  set token_earned_at = now()
  where id = target_message and team_id = target_team and role = 'coach' and token_earned_at is null
  returning id into claimed;
  if claimed is null then
    return -1;
  end if;

  update public.teams
  set hint_tokens_remaining = hint_tokens_remaining + 1,
      hint_tokens_earned = hint_tokens_earned + 1
  where id = target_team and hint_tokens_earned < cap
  returning hint_tokens_remaining into balance;

  if balance is null then
    -- Over the cap: the message stays claimed so it can't pay out later.
    return -1;
  end if;
  return balance;
end;
$$;

revoke execute on function public.earn_hint_token(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.earn_hint_token(uuid, uuid, integer) to service_role;

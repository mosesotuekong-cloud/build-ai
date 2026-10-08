-- The console shows how many players have locked in their solo round, live.
-- RLS still applies: staff see their sessions' checks, players their own.
alter publication supabase_realtime add table public.individual_checks;

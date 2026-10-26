-- Hardening flagged by Supabase's security advisor: pin the search path of
-- the updated_at trigger function, like every other function here.
alter function public.set_updated_at() set search_path = '';

-- Static seed data. Runs after migrations on `supabase db reset`.
-- Users, the demo org and memberships are created by scripts/seed-users.ts,
-- because auth users must be created through the Auth admin API.

insert into public.functions (slug, name, sort_order) values
  ('hr', 'HR', 1),
  ('finance', 'Finance', 2),
  ('sales', 'Sales', 3),
  ('procurement', 'Procurement', 4),
  ('operations', 'Operations', 5),
  ('customer-service', 'Customer Service', 6),
  ('it', 'IT', 7)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

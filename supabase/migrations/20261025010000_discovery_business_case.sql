-- Quick discovery, round two (agreed 2026-10-25): "start from our week"
-- (the tasks a team lists, sorted by the AI) and the business case inputs.
-- Worth it? gains effort and reversibility inside the existing rank column.
alter table public.discoveries add column tasks jsonb;
alter table public.discoveries add column business jsonb;

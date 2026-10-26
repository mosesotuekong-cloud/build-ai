-- Quick discovery feels like a game (agreed 2026-10-26): a board, a
-- discovery score with badges, a reveal and a twist card; and Ask Builda, a
-- chat grounded in how Builda works and in the discovery itself.
--
-- game: { nudges, downloaded, twist: { key, response } }, the facts the
--       score needs that live nowhere else. Written by the server.
-- chat: the Ask Builda conversation, last 40 messages, [{ role, content }].
--       Never includes player names.
alter table public.discoveries add column game jsonb not null default '{}'::jsonb;
alter table public.discoveries add column chat jsonb not null default '[]'::jsonb;

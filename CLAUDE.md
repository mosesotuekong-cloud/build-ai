@AGENTS.md

# Builda

**Start of every session: read `BRIEF.md` in full.** It is the product brief and decisions log. Ask Moses before changing it; record confirmed decisions in its "Decisions log".

## Commands

- `npm run dev`: Next.js dev server on http://localhost:3000
- `npm run db:start` / `npm run db:stop`: Supabase local stack (needs Docker Desktop running)
- `npm run db:reset`: re-run every migration and `supabase/seed.sql`, then `npm run db:seed`
- `npm run db:types`: regenerate `lib/db/types.ts` from the local database
- `npm test`: Vitest unit tests; `npm run test:e2e`: Playwright
- `npm run typecheck`, `npm run lint`

Local URLs: Studio http://localhost:54323, test inbox (magic links) http://localhost:54319.

## Rules of thumb

- Schema changes go only in new files in `supabase/migrations/`. Every table has RLS enabled.
- All AI calls go through `lib/ai/`. Work done for an organisation or session uses `aiForOrg()` / `aiForSession()` (`lib/ai/for-org.ts`), which caps demo sandboxes; use `getAIProvider()` directly only for work that belongs to no organisation. Validate every response with zod. Prompts live in `lib/ai/prompts/`, one file per prompt.
- All n8n calls go through `lib/n8n/client.ts`.
- Exports: the neutral plan (`lib/export/plan.ts`) is the source of truth. The AI only writes plans; compilers behind `WorkflowCompiler` turn them into files. n8n templates in `lib/export/n8n/templates/` come from real node definitions; never guess a node type, typeVersion or parameter shape. Credentials stay empty.
- `lib/supabase/admin.ts` (service role) is server-only. Never import it from client components.
- Never assume a facilitator is present in a session (see "Architecture rule" in the brief). This includes every new phase: baseline_check, fix, prioritise, post_check and commitments.
- Session phases come from one transition table in `lib/session/`. The optional phases depend on session settings, and every allowed and disallowed transition has a unit test under both settings.
- Player names and commitment owner emails never go to the AI provider. Use player ids or "Player 1" in prompts. Anything shared outside the facilitator's organisation is anonymised.
- Hint tokens, earn-back and phase changes are enforced on the server only.
- Phase one and a half features (compliance pack, certificates, AI risk twists, CSV/Jira/UiPath exports) get their columns and tables now; do not build their screens until Moses says so.
- Player-facing copy is plain, friendly British English.
- The method is Fix → Design → Control → Rank (see the 2026-10-10 decision in the brief). Keep new features inside those four steps; anything else is noise until Moses asks for it.

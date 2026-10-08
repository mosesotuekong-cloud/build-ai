# Builda

A game-based workshop tool that teaches teams to spot and design automations in their own work, and gives the business a ranked list of real automation opportunities at the end. The product brief and decisions log are in [BRIEF.md](BRIEF.md).

## Run it locally

You need Node 22+ and Docker Desktop (running). No external accounts are needed: without keys, the app uses mock AI and a local n8n fallback.

```bash
npm install
npm run db:start      # Supabase local stack (Postgres, Auth, Realtime, Storage)
npm run env:local     # writes the local Supabase keys into .env.local
npm run db:reset      # migrations + seed + local users + library HR deck
npm run dev           # http://localhost:3000
```

Local users (sign in with a magic link; emails land in the test inbox at http://localhost:54319):

| Email | What they see |
| --- | --- |
| `facilitator@builda.test` | Console for Demo Company Ltd |
| `otumosesjobs@gmail.com` | Console plus super admin badge |
| `pending@builda.test` | "Waiting for access" page |

Supabase Studio: http://localhost:54323

## AI keys

Put keys in `.env.local` (never commit it). The app uses Anthropic if `ANTHROPIC_API_KEY` is set, otherwise OpenAI if `OPENAI_API_KEY` is set, otherwise sample data. Set `AI_PROVIDER=mock` to click around without spending credit. Model names: `lib/config/models.ts`. To try one real generation from the terminal: `npm run ai:try -- finance`.

## Tests

```bash
npm test              # Vitest unit tests
npm run test:e2e      # Playwright (starts the dev server if needed)
npm run typecheck
npm run lint
```

## Going live later

Fill in `ANTHROPIC_API_KEY`, `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET` in `.env.local`. The "Mock AI" and "Mock n8n" banners in the console disappear when the matching key is set. See `.env.example` for every variable.

## Where things live

- `lib/config/`: product name, env, model names
- `lib/ai/`: the AI provider (Anthropic or mock), prompts, schemas, fixtures
- `lib/n8n/`: the n8n client and its local fallback
- `lib/supabase/`: Supabase clients (browser, server, service role)
- `supabase/migrations/`: every schema change
- `seed/hr-cards.md`: the default HR deck

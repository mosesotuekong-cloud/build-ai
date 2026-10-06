# Build brief: Builda (formerly "Automation Breakout", working title)

You are building a production web app with Moses Otu (Otuek), an automation consultant and n8n community ambassador in Lagos. Read this whole file before writing code, and re-read it at the start of every session. Keep it up to date when we change a decision.

The product name lives in a single config constant (`lib/config/app.ts`) so it can be renamed in one place.

## Decisions log

Newest first. Add a line whenever Moses confirms a change.

- 2026-10-06: The app is gamified (see "Game feel"). Motion library: `motion` (motion/react). Reduced-motion settings are honoured.
- 2026-10-06: Brand updated to match the promo reel: green #0E5E4E (primary), amber #EAAB4E (reserved for "Human in control" and game highlights), cream #FDF5E8 (background), ink #1B1F1D (text). Fonts: Caladea Bold (display) and Carlito (UI). This replaces the earlier clay palette.
- 2026-10-06: The reveal includes a few awards on top of the overall score, such as "Best human checkpoint" and "Most believable hours saved".
- 2026-10-06: Optional sound on the presenter screen only, never on phones, with a facilitator toggle.
- 2026-10-06: Claude writes a one-line "what it costs the business" for each seed HR card, from its story. Moses can edit them.
- 2026-10-06: Project lives at `C:\dev\automation-breakout` (moved out of OneDrive).
- 2026-10-06: Product name shown in the UI is **Builda**. The logo is the word "BUILDA" set as a wordmark, with no separate mark.
- 2026-10-06: Super admin is set by `SUPER_ADMIN_EMAILS` (default `otumosesjobs@gmail.com`) and synced into a `platform_admins` table.
- 2026-10-06: Until milestone 10 (super admin screens), orgs and memberships come only from the seed. A signed-in facilitator with no org sees a "waiting for access" page.
- 2026-10-06: A session credit is used when a session first moves from `draft` to `lobby`. Drafts are free.
- 2026-10-06: Models (in `lib/config/models.ts`): Sonnet 5.5 for the coach, judge, twist and design check; Haiku 4.5 for the leak check; Opus 5.5 for case generation, reference solutions, blueprints and the opportunity map.
- 2026-10-06: Case costs default to naira (₦), for example "costs about ₦1.2m a year in overtime".
- 2026-10-06: Git is local commits only for now. No remote.
- 2026-10-06: Local test inbox (Mailpit) moved to port 54319 and local analytics turned off, because Windows reserves ports 54324–54423 on this machine.
- 2026-10-06: Supabase local rate limit for anonymous sign-ins is raised to 500/hour/IP, because a whole room of phones shares one venue IP. Remember this for production.

## What the product is

A game-based workshop tool that teaches teams to spot and design automations in their own work, and gives the business a ranked list of real automation opportunities at the end.

It started as a paper breakout game run at an HR & Automation event: teams got an HR problem card and filled in a five-step canvas. The six original HR cards are in `seed/hr-cards.md` and ship as the default HR deck.

The buyers are L&D and HR leads in companies, and trainers who run in-house sessions. The audience is mostly Nigerian businesses, so case content should reflect local reality (WhatsApp, guarantor forms, HMOs, paper forms, Excel, Microsoft and Google tools, local HRIS).

## The flow

1. A facilitator logs in, creates a session, enters light company context (industry, size, tools staff use) and picks one or more functions (HR, Finance, Sales, Procurement, Operations, Customer Service, IT).
2. AI generates six case studies per function. The facilitator can edit, delete, reorder or add their own cases. Decks are saved and reusable.
3. Teams join on their phones with a session code and a team name. No player accounts.
4. Each team picks or is assigned a case and fills the five-slot canvas, plus an automation name, hours saved per month and tools.
5. An AI coach helps each team scope the solution through questions. It never gives the answer.
6. Halfway through, a twist changes the team's situation and they adapt their design.
7. Designs are judged against a rubric. The facilitator can override any score. A leaderboard shows on the presenter screen.
8. Reveal: a reference solution for each case is generated and shown.
9. Each team downloads its own design as a tool-neutral blueprint and a starter n8n workflow JSON.
10. The facilitator gets an opportunity map: a ranked automation backlog for the company plus a learning section showing where teams struggled.

## The five-slot canvas

Every design, in every function, uses these slots. This structure is the core of the product.

1. Trigger: what starts it (form submitted, message arrives, date comes round, file uploaded, record changes).
2. Steps: what information is gathered or prepared (look up the employee, read the document, pull data from a sheet or HRIS, tidy it up).
3. Decision: what gets decided, and whether by a rule ("if balance > 0, approve") or by AI ("read this and summarise, classify or score it").
4. Action: what gets done automatically (send the email or message, update the record, alert the manager, build the report).
5. Human in control: which step a person checks, approves or overrides.

Plus: automation name, hours saved per month (rough guess), tools (optional), and the systems involved (used by the access and privacy checks).

Worked example shown to players: "Candidate submits the application form (trigger) → CV text is read (steps) → AI scores it against the job (decision) → invite, recruiter review or polite decline is sent (action) → recruiter decides on every 50–69 score (human)."

## Game feel

Builda should feel like a game in the room, while rewarding good thinking rather than speed. Agreed 2026-10-06.

- Real game objects, not form fields. Case studies are physical-looking cards that tilt, cast a shadow and flip; teams draw a case from a fanned hand. The five slots are sockets on a board: filling one snaps it shut with a spring and lights the connector to the next, so a complete design lights up like a circuit. Amber is reserved for "Human in control".
- Hint tokens are coins. Spending one flips a coin out of the stash; the twist drops a bonus coin in.
- Big moments: the twist dims the screen, stamps "TWIST" on the canvas and vibrates Android phones; teams "Lock it in" to submit; the reveal flips the reference solution slot by slot beside the team's design.
- Presenter screen as a scoreboard: team names pop in as they join; live progress boards show which slots each team has filled, never their content; judging ends with a drumroll and an animated leaderboard; awards at reveal. Optional sound on the projector only.
- The facilitator console stays calm, with light motion only.
- Never reward speed. No points for submitting first.
- Performance: animate transform and opacity only, keep phones light (many players use budget Android phones on venue wifi), and honour the reduced-motion setting.
- The shared game pieces (card, slot socket, connector, token coin, stamp, meter, score ring) live in `components/game/` and are reused on every screen.

## Build without keys first

Real keys and accounts come later. Everything must run locally with no external accounts:

- Use the Supabase CLI local stack (`supabase start`) for Postgres, Auth, Realtime and Storage. All schema changes are migrations in `supabase/migrations`. Include a seed script.
- All AI calls go through one provider interface (`lib/ai/`). If `ANTHROPIC_API_KEY` is missing, use a mock provider that returns realistic fixture responses that match the same zod schemas, with a small artificial delay and streaming for the coach. Fixtures live in `lib/ai/fixtures/`.
- All n8n calls go through one client (`lib/n8n/`). If `N8N_WEBHOOK_BASE_URL` is missing, fall back to calling the same logic locally through the AI provider, so deck generation and reports still work in development.
- Provide `.env.example` with every variable documented. Never commit secrets.
- A banner in the facilitator console shows "Mock AI" or "Mock n8n" when either is active.

## Stack

- Next.js (App Router) with TypeScript, deployed to Vercel later.
- Tailwind CSS. Mobile-first for the team view. Clean, warm, confident design, not generic SaaS blue. Gamified motion with the `motion` library (see "Game feel").
- Supabase: Postgres with row-level security, Auth (email magic link for facilitators and admins; anonymous sign-in for players), Realtime for live session sync, Storage for exports.
- Anthropic TypeScript SDK for live AI calls, with structured outputs. Validate every AI response with zod before using it. Keep model names in config.
- n8n (Moses's cloud instance) for non-live AI work, reached by authenticated webhooks with a shared secret header. n8n writes results back to Supabase using a service key, or returns them to the app.
- Vitest for unit tests and Playwright for a few end-to-end flows.

## Users and screens

- Super admin (Moses): create organizations, activate or deactivate them, grant session credits. Billing is manual for now.
- Facilitator (org member): build and edit decks, create and run sessions, watch any team's coach thread live, override scores, see reports.
- Team player (anonymous): join by code, pick a team, work on the canvas, use the coach, submit.
- Presenter screen: a read-only view for the projector showing phase, timer, twist reveal, leaderboard and reveal.

## Architecture rule that matters most

A session must not require a facilitator, and must work with a single team of a single player. Phase two adds a solo mode where an individual scopes their own problem with the coach, and it must be possible by removing the facilitator from a session rather than building a separate product. Do not hard-code assumptions that break this.

## Session phases

Model the session as an explicit state machine with server-side transitions only:

`draft → lobby → solving → twist → solving_after_twist → judging → reveal → report → closed`

The facilitator (or, in a facilitator-less session, the system or the solo player) advances phases. Every transition is broadcast on a Realtime channel for the session. Timers are server-authoritative: store phase start time and duration, and let clients compute the countdown. Write unit tests for every allowed and disallowed transition.

## Data model (starting point)

Adjust as needed, but keep org isolation through RLS on every table.

- organizations, org_members (role: admin, facilitator)
- functions (catalog), decks, cases (title, story, cost of the problem, who feels it, function, source: ai or manual, order)
- sessions (org, deck, phase, phase_started_at, phase_duration, settings: hint tokens, coach strictness, coach on/off, twist on/off), session_code
- teams (session, name, case, hint_tokens_remaining), players (anonymous user, team)
- designs (team, version: before_twist or after_twist, the five slots, name, hours saved, tools, systems, updated_at)
- coach_messages (team, role, type: question, nudge, analogy, flag, content, slot, tokens_spent)
- design_checks (team, design version, flags with slot, kind and question)
- twists (team, content)
- scores (team, rubric breakdown, total, ai_reasoning, facilitator_override, final)
- reference_solutions (case, the five slots, explanation), generated only at reveal
- blueprints (team, neutral plan JSON, n8n JSON in storage)
- reports (session, opportunity map JSON, rendered document in storage)
- jobs (type, status, payload, result, error) for n8n background work

## AI features

Keep every system prompt in its own file under `lib/ai/prompts/` so Moses can read and tune them.

### Case generator (n8n, before the session)

Input: function, industry, company size, tools used, country (default Nigeria), optional staff pain points. Output: exactly six cases, each with title, a short story, what it costs the business, and who feels it, written in the same voice as the seed HR cards. Cases must be realistic, specific and varied, and each must be solvable with the five-slot canvas.

### Coach (live, direct Claude call, streamed)

One shared thread per team. Context: the team's case, its current design (all slots), the phase, and the twist once it lands. It never sees the reference solution, which does not exist until reveal.

Behaviour: a hint ladder with three levels and never a fourth.

1. Question (free): "What actually starts this process today?"
2. Nudge that names the gap (costs one hint token): "Your decision step has no rule yet. Can a simple rule decide this, or does someone need to read and judge it?"
3. Analogy from a different function (costs one hint token): like the recruitment example, never their own case.

It never fills a slot or writes their design for them, even if asked directly, asked to role-play, or told the facilitator allowed it.

Access and privacy: for every system a team names, the coach asks early who owns it, whether the team can get access, and whether the data includes personal information.

Guardrails, all three required:

- Structured output: every reply is `{ type: "question" | "nudge" | "analogy", slot, text }`. The app rejects any other shape.
- Leak check: a fast, cheap second model call reads each reply against the team's case and current design. If it reads like a filled-in answer for their case, regenerate once as a question; if it fails again, send a safe generic question.
- Token enforcement on the server, never the client.

### Design check (live, costs one hint token)

A "Check our design" button. Flags only hard errors, never judgment calls:

- Trigger is a vague goal, not an event.
- An action needs data that no step gathers.
- AI is used where a simple rule would do, or a rule is used for something that needs judgement.
- No human control on something risky (pay, dismissals, candidate rejections, money).
- Hours saved is far beyond what the process could take.
- The design depends on a system nobody in the team can access.

Each flag names the slot and asks a question. It never fixes anything. Flags do not change the score directly, but all flags are stored for the report.

### Hint tokens

Default three per team, plus one when the twist lands. The facilitator can change both numbers per session. Plain coach questions are free.

### Twist (live)

Generated per team, specific to their case and current design, realistic for the context. Examples: "The line manager is on leave for two weeks", "Half the staff don't have work email", "Finance says no new software this quarter". The pre-twist design is saved as a version.

### Judge (live, all teams in parallel)

Rubric, out of 100:

- Trigger is a real, specific event: 15
- Steps gather everything later steps need: 20
- Rule versus AI fits the decision: 20
- Action is concrete and useful: 15
- Human control is in the right place for the risk: 20
- Hours saved is believable and reasoned: 10

Returns a breakdown, a total and short reasoning per criterion. Scores reward sound reasoning, not matching the reference. Different valid designs can score equally. The facilitator can override; store both.

### Reference solution (at reveal)

Generated per case only when the session reaches reveal, with a short explanation of the choices.

### Opportunity map (n8n, after the session)

Ranked automation backlog for the company: each case and the team's design, estimated hours saved, rule versus AI, effort, and whether IT access or approval is needed first. Plus a learning section built from coach threads and design-check flags, for example "6 of 8 teams left out a human checkpoint until prompted". Written in plain, human prose, not heavy tables. Exportable as PDF.

## Blueprint and n8n export

Do not let the AI write n8n JSON directly.

1. The AI turns the team's final design into a tool-neutral plan using only blocks from an allowlisted catalog: form trigger, schedule trigger, webhook, Gmail, Outlook, Google Sheets, WhatsApp Business, Slack, IF, Switch, AI agent with structured output, HTTP request, send-and-wait approval, set/edit fields. Validate the plan with zod.
2. A deterministic compiler in `lib/export/n8n/` turns the plan into n8n workflow JSON using node templates stored in `lib/export/n8n/templates/`. Build these templates by exporting real nodes from an n8n instance so node types, `typeVersion`s and parameter shapes are exact. Do not guess them. Until Moses exports them, build the compiler and tests against clearly marked placeholder templates.
3. The human-in-control slot compiles to a send-and-wait approval node.
4. Tools with no block (for example a local HRIS) compile to an HTTP Request node with a sticky note explaining what to fill in.
5. Credentials are left empty. Sticky notes explain what to connect and which placeholders to replace.
6. The download screen says plainly that this is a starter workflow, not a finished build.

The neutral plan is the source of truth. Later we will add Power Automate and Copilot Studio compilers, so keep the n8n compiler behind an interface. Write tests that compile every fixture plan and check the output is valid JSON with consistent node names and connections.

## Phase one scope

In: everything above for facilitated sessions, with the default HR deck and AI-generated decks for the other functions.

Out (phase two and later): solo mode UI, staff pain-point intake survey, Power Automate and Copilot exports, pushing workflows directly into a client's n8n, Paystack self-serve payments, trainer licensing. Keep the architecture ready for them, but do not build them.

## Build order

Work in milestones. At the end of each one, run the tests, run the app locally, tell Moses what to click to see it working, and commit.

1. Project setup: Next.js, Tailwind, Supabase local, migrations, seed, `.env.example`, mock AI and mock n8n providers, basic layout and auth for facilitators.
2. Decks: function catalog, seed HR deck, create and edit decks and cases, AI case generation through the n8n client (mocked locally).
3. Session engine: create a session, join code, lobby, the state machine, Realtime sync, server timers, presenter screen.
4. Team canvas: phone view, five slots plus extras, autosave, live sync to facilitator view.
5. Coach: streamed chat, hint ladder, structured output, leak check, tokens, access and privacy questions, facilitator live view.
6. Design check and twist.
7. Judging, facilitator overrides, leaderboard, reveal with reference solutions.
8. Blueprint and n8n export.
9. Opportunity map report and PDF export.
10. Super admin: organizations, activation, session credits.
11. Hardening: RLS tests, Playwright happy path for a full session with two teams, loading and error states, empty states, mobile checks.

## Working agreements

- Ask Moses before changing anything in this brief or adding a paid service.
- Prefer simple, readable code over clever abstractions.
- Every AI response is validated before use, and every failure has a graceful fallback so a live room never stalls.
- Never log or store API keys, and never send player content anywhere except the AI provider and our own database.
- Text the players see should sound human and friendly, in plain British English.

## Seed content: the default HR deck

See `seed/hr-cards.md`.

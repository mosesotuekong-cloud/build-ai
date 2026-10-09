# Build brief: Builda (formerly "Automation Breakout", working title)

You are building a production web app with Moses Otu (Otuek), an automation consultant and n8n community ambassador in Lagos. Read this whole file before writing code, and re-read it at the start of every session. Keep it up to date when we change a decision.

The product name lives in a single config constant (`lib/config/app.ts`) so it can be renamed in one place.

## Decisions log

Newest first. Add a line whenever Moses confirms a change.

- 2026-10-09: No-sign-in demo (milestone 9.5, before milestone 10). "Try the demo" on the home page gives a visitor an anonymous sign-in and a private sandbox organisation (is_demo) that is deleted after 24 hours. Three stops: play a case (practice with the coach, score, model answer, n8n starter), run a room (a live session with three bot teams, visitor on a fourth team, console, big screen and phone), and see a finished sample opportunity map. Live AI is capped: each sandbox gets DEMO_AI_UNITS (default 40, roughly one per AI call), all sandboxes share DEMO_DAILY_AI_UNITS a day (default 600), then scripted replies. At most DEMO_STARTS_PER_IP_PER_DAY sandboxes per IP (only a salted hash is stored). AI case writing is off in demos and demo PDFs are not stored. No bot-check service yet.
- 2026-10-09: Builda is also an AI discovery tool. Every designed use case gets a discovery scorecard (team-rated in the prioritise phase, AI-assessed at judging) and the opportunity map groups use cases into portfolio buckets. Staff can raise their own problems at any time ("Bring your own problem"); these join the backlog, and a team may design one instead of a deck case. See "AI discovery outputs".
- 2026-10-09: Kinds of AI used to classify each use case: simple rule (no AI), classify or route, extract from documents, summarise, draft or generate, answer questions over data, forecast, chat or voice assistant (for example a WhatsApp bot), agent that takes actions.
- 2026-10-09: Milestone 3 defaults. Mixed-function decks: teams draw from the whole pile by default; the facilitator can switch a session to "pick a function first". Teams draw their own case by default; the facilitator can assign instead, and any team without a case is dealt one when design starts. The twist phase locks the canvas and shows the stamp; teams adapt in the next phase, starting from a saved copy of their design. Leaving a switched-off optional phase is allowed, so changing settings mid-session never strands a room. The presenter screen is opened from the facilitator's signed-in laptop.
- 2026-10-09: Tools and systems on the canvas are pick-or-type dropdowns (suggestions plus free entry).
- 2026-10-08: Target platforms. Each organisation records its AI tool stack (several platforms, because clients use different stacks). Decks and sessions pick target platforms from it. Platforms steer case writing and coaching, and drive exports: a real compiler where we have one (n8n first), otherwise a deterministic build guide that maps each slot onto the platform's own concepts. The catalog lives in `lib/config/platforms.ts`. See "Target platforms".
- 2026-10-08: "Try it as a player" (practice mode) is built before milestone 3: a facilitator plays any case alone on the real canvas with the live coach, then finishes to see a score, a model answer and build guides for their stack. It is a single-player, facilitator-less session (mode `practice`), so it uses the same tables and rules as live sessions and costs no session credit.
- 2026-10-07: OpenAI added as a second AI provider (Moses has an OpenAI key). Provider order: Anthropic if `ANTHROPIC_API_KEY` is set, otherwise OpenAI if `OPENAI_API_KEY` is set, otherwise the mock. Model names for both providers live in `lib/config/models.ts`. Every guardrail and zod check applies to both.
- 2026-10-07: The "A day in the office" intro (office simulation) is proposed but not approved; not in the plan yet.
- 2026-10-07: Market research additions approved. Phase one gains a proactive inline coach with token earn-back, a prioritise phase, a commitments phase and optional before-and-after checks with player names at join. Phase one and a half designs the data model now (compliance and funding pack, certificates, AI risk twists, extra opportunity map exports) but builds the screens after the first paid pilot. See "Market research additions".
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

What buyers need to see, from Moses's market research:

- Proof of competence, not attendance. L&D buyers want evidence people got better, hence the before-and-after check.
- Follow-through. Discovery workshops (SAP, OpenAI) end with ranked use cases, named owners and first milestones; internal hackathons rarely show follow-through. Hence the prioritise and commitments phases.
- Funding and compliance evidence. Nigerian employers pay 1% of payroll to the ITF and can claim back up to 50% for ITF-approved training, with evidence. HR professionals earn CIPM CPD points for external training. EU-facing companies need documented AI literacy covering risks and human oversight. Hence the compliance pack, certificates and AI risk twists (phase one and a half).
- A tutor people actually use. Socratic tutors get ignored when students have to ask for help; Khan Academy fixed this by putting the tutor inline and having it appear automatically after mistakes. Hence the proactive inline coach.

## The flow

1. A facilitator logs in, creates a session, enters light company context (industry, size, tools staff use) and picks one or more functions (HR, Finance, Sales, Procurement, Operations, Customer Service, IT).
2. AI generates six case studies per function. The facilitator can edit, delete, reorder or add their own cases. Decks are saved and reusable.
3. Players join on their phones with a session code, their name and a team name. No player accounts.
4. Optional (on by default) baseline check: each player spends 4 minutes alone on a short problem card and the five slots.
5. Each team picks or is assigned a case and fills the five-slot canvas, plus an automation name, hours saved per month and tools.
6. An AI coach helps each team scope the solution through questions. It never gives the answer. It appears inline next to a weak slot, and the full conversation lives in a side thread.
7. Halfway through, a twist changes the team's situation and they adapt their design.
8. Prioritise: each team places its own design on an impact by effort grid and says how often the process happens and whether the data is ready.
9. Designs are judged against a rubric. The facilitator can override any score. A leaderboard shows on the presenter screen.
10. Reveal: a reference solution for each case is generated and shown.
11. Optional (on by default) post check: each player does a different card of the same difficulty, alone.
12. Commitments: each team names an owner, one first step and a due date within 30 days.
13. Each team downloads its own design as a tool-neutral blueprint and a starter n8n workflow JSON.
14. The facilitator gets an opportunity map: a ranked automation backlog for the company, the teams' commitments, the before-and-after improvement, and a learning section showing where teams struggled.

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
- The new phases use the same game pieces: the baseline and post checks are a solo "warm-up round" and "final round" on the same slot sockets; prioritise is dragging the team's card onto the impact by effort grid; commitments is signing a pledge card that gets a stamp.
- The inline coach pops up beside the weak slot as a small speech bubble, never a modal. Earning a token back drops a coin into the stash.
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
- Anthropic TypeScript SDK or OpenAI SDK for live AI calls (whichever key is set; see decisions log), with structured outputs. Validate every AI response with zod before using it. Keep model names in config.
- n8n (Moses's cloud instance) for non-live AI work, reached by authenticated webhooks with a shared secret header. n8n writes results back to Supabase using a service key, or returns them to the app.
- Vitest for unit tests and Playwright for a few end-to-end flows.

## Users and screens

- Super admin (Moses): create organizations, activate or deactivate them, grant session credits. Billing is manual for now.
- Facilitator (org member): build and edit decks, create and run sessions, watch any team's coach thread live, override scores, see reports.
- Team player (anonymous sign-in, no account): join by code with their name, pick a team, do the optional checks, work on the canvas, use the coach, prioritise, submit, commit.
- Presenter screen: a read-only view for the projector showing phase, timer, twist reveal, leaderboard and reveal.

## Architecture rule that matters most

A session must not require a facilitator, and must work with a single team of a single player. Phase two adds a solo mode where an individual scopes their own problem with the coach, and it must be possible by removing the facilitator from a session rather than building a separate product. Do not hard-code assumptions that break this.

## Session phases

Model the session as an explicit state machine with server-side transitions only:

`draft → lobby → baseline_check (optional) → solving → twist → solving_after_twist → prioritise → judging → reveal → post_check (optional) → commitments → report → closed`

The facilitator (or, in a facilitator-less session, the system or the solo player) advances phases. Every transition is broadcast on a Realtime channel for the session. Timers are server-authoritative: store phase start time and duration, and let clients compute the countdown. Write unit tests for every allowed and disallowed transition.

Optional phases: when the before-and-after check is off, `lobby → solving` and `reveal → commitments` are allowed directly and `baseline_check` / `post_check` are not. The transition table depends on session settings, and the tests cover both settings. The no-facilitator, single-player rule applies to every new phase: a solo player can complete the checks, prioritise and commit on their own.

## Data model (starting point)

Adjust as needed, but keep org isolation through RLS on every table.

- organizations (plus ai_stack: platform slugs), org_members (role: admin, facilitator)
- functions (catalog), decks (plus target_platforms), cases (title, story, cost of the problem, who feels it, function, source: ai or manual, order)
- sessions (org, deck, mode: live or practice, target_platforms, phase, phase_started_at, phase_duration, started_at, ended_at, settings: hint tokens, twist bonus tokens, coach strictness, coach on/off, inline coach on/off and idle delay, max tokens earned back, twist on/off, twist mix (operational, risk or mixed), before-and-after check on/off), session_code
- teams (session, name, case, hint_tokens_remaining, hint_tokens_earned), players (anonymous user, team, display name, joined_at, left_at)
- designs (team, version: before_twist or after_twist, the five slots, name, hours saved, tools, systems, updated_at, plus the discovery scorecard on the current version: impact 1–5, effort 1–5, frequency, volume per month, data location, data access, data quality, personal data, risks, kind of AI, platform fit)
- ideas (session, team, player, title, what happens, who feels it, frequency, status: raised or designed, case when designed). Raised problems; writes go through the server.
- cases also carry an optional session (a team's own problem, used only in that session) and source raised
- coach_messages (team, role, type: question, nudge, analogy, flag, content, slot, trigger: asked, inline_idle or inline_flag, tokens_spent, token_earned_at)
- design_checks (team, design version, flags with slot, kind and question)
- twists (team, kind: operational or risk, content)
- scores (team, rubric breakdown, total, ai_reasoning, facilitator_override, final)
- check cards: a curated bank of short problem cards in matched pairs of equal difficulty, kept in code (`lib/checks/cards.ts`) so they are versioned and reviewable; checks reference a card by id
- individual_checks (player, session, kind: baseline or post, check card, the five slots, rubric breakdown, total, ai_reasoning)
- commitments (team, session, owner name, owner email optional, first step, due date within 30 days of the session, follow-up status)
- reference_solutions (case, the five slots, explanation), generated only at reveal
- blueprints (team, neutral plan JSON, n8n JSON in storage)
- reports (session, opportunity map JSON, rendered document in storage)
- report_exports (report, format: pdf, csv, jira or uipath, file in storage). PDF only in phase one.
- compliance_templates (org or global, kind: itf_pack or ai_literacy, version, programme outline, learning outcomes, layout settings). Phase one and a half.
- compliance_packs (session, template version, file in storage, generated_at). Phase one and a half.
- certificates (player, session, hours, certificate number, file in storage, issued_at). Phase one and a half.
- jobs (type, status, payload, result, error) for n8n background work, including `commitment-follow-up`

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

Proactive inline coach. As well as the side thread, the coach appears inline next to a slot when that slot looks weak, with one short question (always level 1, free):

- a slot is still empty after the session's idle delay (default 4 minutes into solving), or
- a design check flagged that slot.

At most one open inline question per slot, and not again for the same slot until the team has changed it. The side thread keeps the full conversation, and inline questions appear in it too.

Token earn-back. When a team meaningfully changes a slot after a coach question about that slot (inline or in the thread), it earns one hint token back. Each coach message can earn at most one token. The change must be real (not a single character or whitespace), and a team can earn at most the session's earn-back cap (default 3). Enforced on the server.

All existing guardrails apply to inline questions: structured output, leak check and server-side tokens.

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

Default three per team, plus one when the twist lands, plus up to three earned back by acting on coach questions. The facilitator can change all three numbers per session. Plain coach questions are free.

### Twist (live)

Generated per team, specific to their case and current design, realistic for the context. Examples: "The line manager is on leave for two weeks", "Half the staff don't have work email", "Finance says no new software this quarter". The pre-twist design is saved as a version.

Twists have a kind. Phase one builds operational twists only. The `kind` field and the session's twist mix setting exist from the start, so AI risk twists (phase one and a half) slot in without a migration.

### Prioritise (team, no AI)

After solving_after_twist, each team drags its design onto an impact (low to high) by effort (low to high) grid, picks how often the process happens (daily, weekly, monthly, quarterly or less) and whether the data is ready (ready, partly, not yet). Stored on the final design version. The opportunity map shows the team's placement beside the AI's assessment, and points out where they disagree.

### Before-and-after check (optional, on by default)

At the start, each player does a 4-minute solo exercise on their own phone: a short problem card and the five slots. After the reveal, they do a different card of the same difficulty. Both are scored with the existing judge rubric and stored as individual checks. Cards come from a curated bank of matched pairs, not AI-generated per session, so difficulty stays consistent and results compare fairly across sessions. The report shows average improvement per session and per criterion, with human control and rule versus AI first.

Players enter a name at join, with a short note: "Your facilitator sees your name next to your results. Anything shared outside your organisation is anonymous." Names never go to the AI provider. Prompts use player ids or "Player 1". Anything shared outside the facilitator's organisation is anonymised.

### Commitments (team, no AI)

After the reveal (and the post check, if on), each team names an owner (name, optional email), one first step and a due date within 30 days. Stored in commitments and listed in the opportunity map. A `commitment-follow-up` n8n job type exists from the start, to message each owner on the due date. In phase one it is only stored and mocked locally; nothing is sent.

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

Ranked automation backlog for the company: each case and the team's design, estimated hours saved, rule versus AI, effort, and whether IT access or approval is needed first. The ranking uses the team's own prioritise placement alongside the AI's assessment, and shows both when they disagree. Then the commitments (owner, first step, due date). Then the before-and-after improvement, if the check was on. Plus a learning section built from coach threads and design-check flags, for example "6 of 8 teams left out a human checkpoint until prompted". Written in plain, human prose, not heavy tables. Exportable as PDF (phase one), then CSV, Jira and UiPath Automation Hub formats (phase one and a half).

## Target platforms

Clients run different AI tool stacks, so Builda is platform-aware without being tied to one vendor.

- The catalog (`lib/config/platforms.ts`) lists automation tools (n8n, Power Automate, Zapier, Make, Workato), agent and copilot builders (Copilot Studio, Microsoft 365 Copilot, Agentforce, Gemini Enterprise, ChatGPT Enterprise, Claude, watsonx Orchestrate, Amazon Q), data and analytics AI (Databricks Genie, Databricks agents, Snowflake Cortex, Microsoft Fabric, Power BI Copilot, Looker with Gemini), RPA (UiPath, Automation Anywhere) and business suites (ServiceNow, SAP, Zoho). Each entry has a category, what it is good for, and how each of the five slots is built on it. Product names change often; they live in one file so they are easy to update.
- An organisation records its AI tool stack in console settings. A new deck starts with the organisation's stack and can narrow it. Sessions will carry the deck's platforms.
- Case writing: the generator favours problems the stack can actually solve. For example, data-question cases for Genie or Cortex, and agent cases for Copilot or Agentforce. Cases still describe today's problem, never the solution.
- Coaching: the coach may use the stack's vocabulary in questions ("Where would this agent find its knowledge?"), never to hand over a design.
- Exports: the neutral plan stays the source of truth. n8n has a real compiler (milestone 8). Every other platform gets a build guide that maps the team's five slots onto that platform's concepts. Real compilers for Power Automate, Copilot Studio and others come later, built from exported templates as with n8n.
- Partner use: the opportunity map can group use cases by platform, so a technology partner (Microsoft, Databricks, Salesforce and so on) sees which opportunities fit which product.

## Practice mode ("Try it as a player")

From any case card, a facilitator can play the case alone: the real phone canvas, autosave, the live coach with the hint ladder, coins, and the leak check. "Finish" judges the design with the rubric, shows a model answer for the case, and shows build guides for the organisation's stack. Practice is a session with mode `practice`, one team and one player, no lobby and no credit. It proves the architecture rule (no facilitator, single player) and is the base for solo mode in phase two.

## Blueprint and n8n export

Do not let the AI write n8n JSON directly.

1. The AI turns the team's final design into a tool-neutral plan using only blocks from an allowlisted catalog: form trigger, schedule trigger, webhook, Gmail, Outlook, Google Sheets, WhatsApp Business, Slack, IF, Switch, AI agent with structured output, HTTP request, send-and-wait approval, set/edit fields. Validate the plan with zod.
2. A deterministic compiler in `lib/export/n8n/` turns the plan into n8n workflow JSON using node templates stored in `lib/export/n8n/templates/`. Build these templates by exporting real nodes from an n8n instance so node types, `typeVersion`s and parameter shapes are exact. Do not guess them. Until Moses exports them, build the compiler and tests against clearly marked placeholder templates.
3. The human-in-control slot compiles to a send-and-wait approval node.
4. Tools with no block (for example a local HRIS) compile to an HTTP Request node with a sticky note explaining what to fill in.
5. Credentials are left empty. Sticky notes explain what to connect and which placeholders to replace.
6. The download screen says plainly that this is a starter workflow, not a finished build.

The neutral plan is the source of truth. Later we will add Power Automate and Copilot Studio compilers, so keep the n8n compiler behind an interface. Write tests that compile every fixture plan and check the output is valid JSON with consistent node names and connections.

## AI discovery outputs

Builda is a game for learning and an AI discovery tool for the business. The rubric score teaches; the discovery assessment informs decisions. Both are kept.

Discovery scorecard, per designed use case. Teams rate their own in the prioritise phase (about three minutes, game-like); the AI assesses the same things at judging, and both views are kept when they disagree.

- Impact (low to high) by effort (low to high): the team drags its card onto a grid.
- How often it happens (daily, weekly, monthly, rarely) and rough volume per month.
- Data readiness, four quick taps: do we know where the data lives, can we get access, is it clean enough, does it contain personal data.
- Risk: touches money, pay, decisions about people, customer-facing replies, health and safety, or legal and compliance.
- Kind of AI needed (see the decisions log for the list), suggested from the Decision slot.
- Best-fit platform from the session's stack.

Bring your own problem. At any time in a session (lobby, design, prioritise) a player can raise a problem from their own work: what happens, who feels it, how often. Raised problems join the backlog marked "raised, not yet designed". In the lobby a team can choose to design its own problem instead of a deck card; it becomes a case for that session only and never changes the deck.

Opportunity map in discovery language: use cases grouped into Quick wins (high value, low effort, data ready), Strategic bets (high value, needs work), Fix the data first (value is there, data is not ready) and Park (not worth it now). Each shows the kind of AI, risk level, platform fit and owner. Raised problems are listed too, and a one-page executive summary leads the report.

## Market research additions

Approved 2026-10-07. Phase one items are built inside the existing milestones (see "Build order"). Phase one and a half items get their data model now; their screens come after the first paid pilot.

Phase one:

1. Proactive inline coach with token earn-back (see "Coach").
2. Prioritise phase (see "Prioritise").
3. Commitments phase, commitments table and the mocked `commitment-follow-up` job (see "Commitments").
4. Before-and-after check with player names at join (see "Before-and-after check").

Phase one and a half (after the first paid pilot):

5. Compliance and funding pack per session: attendance register (names, dates, duration), programme outline, learning outcomes and before-and-after results, formatted to attach to an ITF reimbursement claim or an AI literacy record. Built from editable templates (`compliance_templates`), because Moses will confirm the exact ITF requirements before the format is final.
6. Per-participant PDF certificates with session details and hours, worded so HR staff can claim CIPM CPD credit.
7. AI risk twist cards, for example "the AI scored a candidate unfairly", "the AI made up a leave balance", "staff data was pasted into a public chatbot". The facilitator chooses operational, risk or mixed. They push teams to strengthen the human control slot.
8. More opportunity map exports: CSV first, then Jira and UiPath Automation Hub.

## Phase one scope

In: everything above for facilitated sessions, with the default HR deck and AI-generated decks for the other functions, including the phase one market research additions.

Phase one and a half: the data model for items 5–8 above is designed into the phase one migrations; screens and generators are built after the first paid pilot.

Out (phase two and later): solo mode UI, staff pain-point intake survey, Power Automate and Copilot exports, pushing workflows directly into a client's n8n, Paystack self-serve payments, trainer licensing. Keep the architecture ready for them, but do not build them.

## Build order

Work in milestones. At the end of each one, run the tests, run the app locally, tell Moses what to click to see it working, and commit.

1. Project setup: Next.js, Tailwind, Supabase local, migrations, seed, `.env.example`, mock AI and mock n8n providers, basic layout and auth for facilitators.
2. Decks: function catalog, seed HR deck, create and edit decks and cases, AI case generation through the n8n client (mocked locally).
3. Session engine: create a session, join code, lobby, the state machine with all phases (including baseline_check, prioritise, post_check and commitments, and the optional-phase rules), tests for every allowed and disallowed transition under both check settings, session settings (before-and-after check, inline coach delay, earn-back cap, twist mix), player name at join with the privacy note, attendance timestamps, Realtime sync, server timers, presenter screen.
4. Team canvas: phone view, five slots plus extras, autosave, live sync to facilitator view; the discovery scorecard in the prioritise phase; Bring your own problem; the solo check screens for baseline and post checks on the same slot sockets; the check card bank (matched pairs).
5. Coach: streamed chat, hint ladder, structured output, leak check, tokens, access and privacy questions, facilitator live view; the proactive inline coach on idle slots; token earn-back with its server-side rules.
6. Design check and twist: inline coach also appears on flagged slots; twists carry a kind (operational only in phase one).
7. Judging, facilitator overrides, leaderboard, reveal with reference solutions; the AI discovery assessment beside the team's scorecard; scoring of baseline and post checks with the same rubric; the commitments phase screen and the commitments table; the `commitment-follow-up` job type, mocked locally.
8. Blueprint and n8n export.
9. Opportunity map report and PDF export, in discovery language (portfolio buckets, executive summary, raised problems), with the team's scorecard beside the AI's assessment, commitments, and before-and-after improvement per session and per criterion.
10. Super admin: organizations, activation, session credits.
11. Hardening: RLS tests (including names staying inside the org), Playwright happy path for a full session with two teams through every phase with the checks on, and a shorter run with them off, loading and error states, empty states, mobile checks.

Phase one and a half (after the first paid pilot, data model already in place): compliance and funding pack, certificates, AI risk twists, CSV, Jira and UiPath exports.

## Working agreements

- Ask Moses before changing anything in this brief or adding a paid service.
- Prefer simple, readable code over clever abstractions.
- Every AI response is validated before use, and every failure has a graceful fallback so a live room never stalls.
- Never log or store API keys, and never send player content anywhere except the AI provider and our own database.
- Player names and owner emails stay in our database. They never go to the AI provider, and anything shared outside the facilitator's organisation is anonymised.
- Text the players see should sound human and friendly, in plain British English.

## Seed content: the default HR deck

See `seed/hr-cards.md`.

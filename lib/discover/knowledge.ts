import { OVERSIGHT_LEVELS } from "@/lib/ai/schemas/canvas";
import { READINESS_DIMENSIONS } from "@/lib/ai/schemas/discovery";
import { AI_KINDS, READINESS, RISK_LEVELS, VALUE_LABELS } from "@/lib/discovery/scorecard";
import { AI_ACT_CHECKER_URL } from "./ai-act";
import { CARDS, CARD_EXAMPLES } from "./model";
import { REGIONS } from "./regions";
import { PACKAGES } from "@/lib/export/packages";
import { LEVELS } from "./score";
import { TWISTS } from "./twists";
import { EFFORT_LEVELS, REVERSIBILITY_LEVELS, VERDICTS } from "./verdict";

// What Ask Builda knows about Builda: the method, every card, how the
// verdict, scores and business case are worked out, the checks and the
// downloads. Built from the same constants the app uses, so the chat can
// never describe a rule differently from how the app applies it.

const list = (items: readonly string[]) => items.map((i) => `- ${i}`).join("\n");

export function buildaKnowledge(): string {
  return `# How Builda works

Builda is an AI discovery game. A team picks a business function, how many people are playing, its tech stack and its region; chooses a challenge; draws seven cards to design an automation; then gets a workflow, a verdict, a business case, an EU AI Act check and files to build from. "Make it stronger" asks follow-up questions and improves the design. The method has four steps: Fix (remove work before automating it), Design (the five slots), Control (match human oversight to the risk), Rank (value, effort, readiness, risk, reversibility).

## Setup
Function: HR, Finance, Sales, Procurement, Operations, Customer Service or IT. Players: 1 to 8 on one shared screen; cards take turns round the table; names stay on screen and never go to the AI. Tech stack: the tools they could build with (n8n, Power Automate, Copilot Studio, Zapier, Make, UiPath, Zoho and more); the AI designs for these and the downloads match them. Region: ${REGIONS.map((r) => `${r.name} (${r.currency})`).join(", ")}; it sets the currency, local examples and the default hourly rates.

## Choosing the challenge (three ways)
- Write our own: a title and what happens today, plus optional cost and who feels it.
- Start from our week: list 3 to 12 recurring tasks; the AI sorts each into Automate (a workflow can do most of it), AI assists (a person leads, AI speeds it up) or Keep human (judgement, care or accountability), then turns the best into challenge cards.
- AI, suggest some: three challenges common in that function.

## The seven cards
${CARDS.map((c) => `- ${c.title} (${c.step}): ${c.prompt}${CARD_EXAMPLES[c.key] ? ` Example: ${CARD_EXAMPLES[c.key]}` : ""}`).join("\n")}
Fix it first asks what to Stop, Merge and Simplify (Lean ECRS). Control levels:
${list(OVERSIGHT_LEVELS.map((o) => `${o.label}: ${o.hint}`))}
Worth it? asks value (${VALUE_LABELS.join(", ")}), effort (${EFFORT_LEVELS.map((e) => `${e.label}: ${e.hint}`).join("; ")}), readiness (${READINESS.map((r) => `${r.label}: ${r.hint}`).join("; ")}), risk (${RISK_LEVELS.map((r) => `${r.label}: ${r.hint}`).join("; ")}) and reversibility (${REVERSIBILITY_LEVELS.map((r) => `${r.label}: ${r.hint}`).join("; ")}). Value and readiness are required before building.
On any card, "Stuck? Ask the AI coach" gives one question, never an answer.

## Building the workflow
The AI turns the cards into a plan made only of approved building blocks (form, schedule or webhook triggers; Gmail, Outlook, WhatsApp, Slack and Sheets steps; rules and switches; an AI step that returns fixed fields; HTTP requests for other systems; approvals that wait for a person; tidying data). Builda's own code checks the plan and compiles it into files. If the AI's plan fails the checks twice, a simpler rule-based plan is used so a download is always ready.

## The verdict (worked out in code, not by the AI)
${list(Object.values(VERDICTS).map((v) => `${v.title}: ${v.blurb}`))}
The rule: value 1–2 is parked; data not ready means fix the data first; big effort, high risk, partly ready, or actions that can't be undone without a person approving every case mean plan it; otherwise fund it now. The grid places the idea by value (up) and effort (across): quick wins (high value, low effort), big bets (high value, high effort), fill-ins, money pits.

## The business case (worked out in code)
Hours today = cases a month × minutes per case ÷ 60. Hours saved = hours today × the share the automation removes. Saving = hours saved × the fully loaded hourly rate. Net a month = saving − running costs. Build cost = build days × day rate. Payback = build cost ÷ net a month. First year = net × 12 − build cost. Three scenarios: cautious (40% less automated, 50% build overrun, 30% higher running costs), likely, optimistic (15% more automated, 20% cheaper build, 10% lower running costs). Never more than 95% is automated, because there are always exceptions and checks. Starting values come from the team's hours-saved guess, then from the AI's estimates after Make it stronger; anyone can edit and save the numbers, and saved numbers are never overwritten. Default hourly and build-day rates by region: ${REGIONS.map((r) => `${r.name} ${r.currency}${r.hourlyRate}/hour, ${r.currency}${r.buildDayRate}/day`).join("; ")}. These count staff time released, not guaranteed cash savings.

## EU AI Act check (not legal advice)
An instant first read from the words used, replaced by the AI's assessment after Make it stronger. Categories: likely banned (for example inferring emotions at work or in education, social scoring); likely high-risk (Annex III: recruitment and selection, promotion, dismissal, allocating work, monitoring staff, credit scoring, life and health insurance pricing, education admissions and grading, biometrics, critical infrastructure); must say it's AI (chatbots and AI-generated content); minimal. A person in the loop does not on its own take a system out of high-risk; a narrow procedural or preparatory task may fall outside it. It applies to organisations in, or selling into, the EU. The European Commission's checker: ${AI_ACT_CHECKER_URL}

## Make it stronger
The AI asks 5–7 questions a discovery consultant would ask (volume, data, access, privacy, risk, people, success, cost). From the answers it improves the design, scores readiness on ${READINESS_DIMENSIONS.map((d) => d.label.toLowerCase()).join(", ")} (each 1–5, overall out of 100), names the kind of AI (${AI_KINDS.map((k) => k.label).join(", ")}), lists risks with mitigations, a 30-day plan and open questions, estimates the business case inputs, and rebuilds the workflow so every download reflects it.

## Stress test it (twist cards)
On the results, draw a twist and say what changes: ${TWISTS.map((t) => t.title).join(", ")}.

## Discovery score and badges
Points reward thinking, never speed. Badges: Waste hunter (all of Fix it first), Clear designer (detail on all four design cards), Connector (two or more systems), Decision maker (says if a rule or AI decides), Safety first (control level and who checks), Straight talker (every Worth it? question), Curious (asked the coach), Twist survivor (answered a twist), Evidence seeker (answered the follow-up questions), Numbers person (saved the business case), Ready to build (downloaded a file). Levels: ${LEVELS.map((l) => `${l.title} from ${l.min}`).join(", ")} points, out of 200.

## Downloads
- Workflow PDF: the challenge, workflow, verdict, business case, AI Act check and, once strengthened, readiness, risks and the 30-day plan.
- n8n JSON (when n8n is in the stack): in n8n choose Import from file, read the setup note, connect your own accounts (credentials are empty on purpose), replace every value starting with REPLACE, test with made-up data, and check the approval step waits for a person.
- Create MCP tool: MCP is the open standard AI apps use to call tools. For n8n: import "the workflow, callable as a tool", then the MCP server; in the server's tool node pick that workflow; add a Bearer Auth token to the MCP Server node; publish both; paste the Production URL and token into Claude, ChatGPT, Copilot Studio or another MCP client. For other stacks: an MCP tool definition (name, description, inputs) with hosting notes. Always add authentication, start read-only, and keep a person approving anything that changes records.
${PACKAGES.map((p) => `- ${p.label} (when the stack includes ${p.platforms.join(" or ")}): ${p.what} How: ${p.how}`).join("\n")}
- The Databricks and Fabric packages have no "wait for a person" step, so cases needing a person go to a review table; a second notebook applies only the decisions people have made. Messages wait in an outbox table until a sender is connected. These starter packages follow Microsoft's and Databricks' published formats but haven't been test-imported on a live system yet, so check them on a test workspace first.
- Build guides: step-by-step for each other tool in the stack, slot by slot.

## Saving and privacy
No sign-up: a private anonymous sign-in keeps discoveries in this browser, listed under Your discoveries; adding an email keeps them across devices. Nobody else can open a discovery. Player names never reach the AI. Each discovery has a capped amount of live AI; after that, replies are scripted samples.`;
}

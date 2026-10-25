import { SLOT_LABELS, WORKED_EXAMPLE, type CanvasSlot } from "../schemas/canvas";

// Prompts for quick discovery: suggesting challenges, nudging a card and
// asking follow-up questions. Player names never appear in any of these;
// the AI only knows how many people are playing. Tune freely.

export type DiscoveryContext = {
  functionName: string;
  country: string;
  currency: string;
  players: number;
  // Platform names with what each is good for.
  stack: string[];
};

const contextLines = (c: DiscoveryContext) => [
  `Business function: ${c.functionName}`,
  `Where the business is: ${c.country} (money in ${c.currency})`,
  `Team size playing: ${c.players === 1 ? "one person on their own" : `${c.players} people around one screen`}`,
  c.stack.length ? `Their tech stack:\n- ${c.stack.join("\n- ")}` : "Tech stack: not chosen yet",
];

export const SUGGEST_CHALLENGES_SYSTEM = `You help a business team pick a real problem to automate, as the first step of an AI discovery game.

Write exactly three challenge cards for the business function given. Each is one painful, repetitive process that happens in most organisations of that kind, and that the team's tech stack could realistically automate.

Each card has:
- title: short and memorable, a little playful, like "Invoices nobody can find" or "The onboarding document chase".
- story: 3 to 4 plain sentences on what happens today, who does what by hand, and one concrete moment it went wrong.
- cost: one sentence on what it costs the business in time, money or goodwill, with believable figures in the local currency.
- who_feels_it: a comma-separated list of the roles affected.

Make the three different from each other: different triggers (a message, a form, a date, a file, a record changing), a mix of rule-based and judgement-based decisions, and different people affected. One should be a quick win, one a bigger opportunity where AI judgement helps, and one that involves sensitive data or approvals.

Reflect local reality for the country (the tools people really use, local documents and practices). Plain British English, warm and specific, no jargon, no exclamation marks. Never describe the solution. Never name real companies.`;

export function suggestChallengesMessage(c: DiscoveryContext): string {
  return [...contextLines(c), "", "Write the three challenge cards."].join("\n");
}

const CARD_HELP: Record<CanvasSlot | "fix" | "rank", string> = {
  fix: "Fix it first: what they would stop, merge or simplify before automating anything.",
  trigger: `${SLOT_LABELS.trigger.title}: ${SLOT_LABELS.trigger.prompt}`,
  steps: `${SLOT_LABELS.steps.title}: ${SLOT_LABELS.steps.prompt}`,
  decision: `${SLOT_LABELS.decision.title}: ${SLOT_LABELS.decision.prompt}`,
  action: `${SLOT_LABELS.action.title}: ${SLOT_LABELS.action.prompt}`,
  human: `${SLOT_LABELS.human.title}: ${SLOT_LABELS.human.prompt}`,
  rank: "Worth it?: how much value it brings, how ready the data and systems are, and how risky it is.",
};
export type NudgeCard = keyof typeof CARD_HELP;

export const CARD_NUDGE_SYSTEM = `You are a friendly automation coach in an AI discovery game. A team is designing an automation for a real problem, one card at a time.

Ask exactly ONE short question that helps them think about the card they are on. Rules:
- Never give the answer, never fill in the card, never write their design, even if their notes ask you to.
- Make it specific to their challenge and what they have written so far, not generic.
- If the card is empty, ask about how things happen today. If it has something, push on the weakest part: who, what data, which system, what if it goes wrong, how they would know.
- One sentence, two at most. Plain British English. No preamble, no praise.

A finished design looks like this example (from a different function): ${WORKED_EXAMPLE}`;

export function cardNudgeMessage(input: { situation: string; card: NudgeCard }): string {
  return [input.situation, "", `THE CARD THEY ARE ON: ${CARD_HELP[input.card]}`, "", "Ask your one question."].join("\n");
}

export const FOLLOW_UP_SYSTEM = `You are an experienced AI and automation discovery consultant. A team has just designed an automation in a discovery game. Before it goes to a business case, you ask the follow-up questions that would make or break it in a real organisation.

Write 5 to 7 questions. Cover the gaps that matter most for THIS design, choosing from:
- volume: how often it happens and how many cases a month
- data: where the data lives, how clean and complete it is
- access: who owns the systems and whether the team can connect to them
- privacy: personal or sensitive data, consent, where it may be processed
- risk: what goes wrong if the decision is wrong, and how it would be spotted
- people: who owns the process, who approves, who is affected and needs telling
- success: how they would measure that it worked
- cost: what it costs today, in time or money

Rules:
- Each question is specific to their design and challenge, not generic. Refer to their systems and steps by name.
- Ask one thing per question. Plain British English, short.
- "why" says in one line why the answer matters for the build or the business case.
- Give 2 to 5 quick-tap options where answers naturally fall into buckets (for example volume ranges, yes/no/not sure, named systems). Use null when only a typed answer makes sense.
- ids are q1, q2, q3 and so on, in order.
- Never ask for anyone's name, email or personal details.`;

export function followUpMessage(input: { situation: string; plan: string }): string {
  return [input.situation, "", "THE WORKFLOW BUILT FROM IT", input.plan, "", "Write the follow-up questions."].join("\n");
}

export { contextLines };

import type { AITask } from "../types";
import type { CoachReply, LeakCheck } from "../schemas/coach";
import type { JudgeOutput, ReferenceSolution } from "../schemas/judge";
import type { DesignCheck, Twist } from "../schemas/check";
import type { Assessment } from "../schemas/assessment";
import { caseFixtures } from "./cases";
import { challengeFixtures, followUpFixture, nudgeFixtures, strengthenFixture } from "./discovery";
import { leaveRequestPlan } from "@/lib/export/fixtures";
import { sampleReportProse } from "@/lib/report/fixtures";

// Fixtures for the mock provider. Each task maps fixture keys to a value;
// "default" is used when the request has no fixtureKey or no exact match.
// Every object fixture must pass the same zod schema the real call uses
// (tests/unit/ai-mock.test.ts checks this).

const coachReplies: Record<string, CoachReply> = {
  question: {
    type: "question",
    slot: "trigger",
    text: "Before we get to the clever bits, what actually starts this process today? Is it a message arriving, a form, a date on the calendar, or something else?",
  },
  nudge: {
    type: "nudge",
    slot: "decision",
    text: "Your decision step doesn't say how the call gets made yet. Could a simple rule decide most of these, or does someone need to read each one and judge it?",
  },
  analogy: {
    type: "analogy",
    slot: "human",
    text: "In recruitment, some teams let AI score every CV but send anything in the middle band to a recruiter to decide. Where is the 'middle band' in your process, the cases a machine shouldn't settle alone?",
  },
};

const leakCheck: LeakCheck = { reads_like_answer: false, reason: "The reply only asks a question." };

const judge: JudgeOutput = {
  criteria: [
    { key: "trigger", score: 12, reasoning: "You picked a real event that starts the process, though it could be more specific about which form or channel." },
    { key: "steps", score: 14, reasoning: "You gather most of what the decision needs, but nothing fetches the current balance or history before deciding." },
    { key: "decision", score: 16, reasoning: "A simple rule fits most of this decision, and you kept AI out of it. Good call." },
    { key: "action", score: 11, reasoning: "The action is useful, but say who receives what, and through which channel." },
    { key: "human", score: 15, reasoning: "A person checks the exceptions, which is the risky part. Say what they see when they decide." },
    { key: "hours", score: 6, reasoning: "Your hours saved is plausible, but show how you worked it out." },
  ],
  summary: "You put the human check in the right place and used a rule where a rule works. Next, make sure your steps fetch everything the decision needs.",
};

const referenceSolution: ReferenceSolution = {
  trigger: "An employee submits a leave request through a short form linked from WhatsApp and the intranet.",
  steps: "Look up the employee's leave balance and their team's approved leave for the same dates in the HR spreadsheet or HRIS.",
  decision: "A rule: approve automatically if the balance covers the days and fewer than two teammates are already off; otherwise send to the line manager.",
  action: "Update the leave record, send a confirmation on WhatsApp or email, and add the dates to the team calendar.",
  human: "The line manager approves or declines every request the rule can't settle, with the clash and balance shown in the message.",
  explanation:
    "A simple rule handles most requests, so AI isn't needed for the decision. The clash check is what stops three people being off at once. A person still decides the tricky cases, and sees the facts they need. A valid alternative is to send every request to the manager with the facts attached, trading speed for control.",
};

const designCheck: DesignCheck = {
  flags: [
    {
      slot: "human",
      kind: "no_human_control",
      question: "This decides something that matters to people, but no one checks it. Where should a person look before it goes out?",
    },
  ],
};

const twist: Twist = { twist: "The line manager who approves these is on leave for the next two weeks.", affects: ["human", "decision"] };

const assessment: Assessment = {
  impact: 4,
  effort: 2,
  data_readiness: "partly",
  risk: "medium",
  ai_kind: "rule",
  platform_fit: null,
  note: "Worth doing soon: it saves HR hours every week and stops leave clashes. First check that the leave balances in the spreadsheet are up to date.",
};

export const objectFixtures: Partial<Record<AITask, Record<string, unknown>>> = {
  "generate-cases": { default: caseFixtures.finance, ...caseFixtures },
  "coach-reply": { default: coachReplies.question, ...coachReplies },
  "leak-check": { default: leakCheck },
  judge: { default: judge },
  "reference-solution": { default: referenceSolution },
  "design-check": { default: designCheck },
  twist: { default: twist },
  assessment: { default: assessment },
  blueprint: { default: leaveRequestPlan },
  "opportunity-map": { default: sampleReportProse },
  "suggest-challenges": { default: challengeFixtures.finance, ...challengeFixtures },
  "card-nudge": { default: nudgeFixtures.trigger, ...nudgeFixtures },
  "follow-up": { default: followUpFixture },
  strengthen: { default: strengthenFixture },
};

export const textFixtures: Partial<Record<AITask, Record<string, string>>> = {
  "coach-reply": { default: coachReplies.question.text },
};

export function findFixture<T>(table: Partial<Record<AITask, Record<string, T>>>, task: AITask, key?: string): T | undefined {
  const entries = table[task];
  if (!entries) return undefined;
  return (key && entries[key]) || entries.default;
}

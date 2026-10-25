import type { CardNudge, FollowUp, Strengthened, Triage } from "../schemas/discovery";
import { caseFixtures } from "./cases";

// Scripted replies for quick discovery, used by the mock provider (no AI key,
// or a spent budget). They must pass the same schemas as the real calls.

export const challengeFixtures: Record<string, { challenges: unknown[] }> = Object.fromEntries(
  Object.entries(caseFixtures).map(([fn, deck]) => [fn, { challenges: (deck as { cases: unknown[] }).cases.slice(0, 3) }]),
);

export const nudgeFixtures: Record<string, CardNudge> = {
  fix: { question: "Is there a step in this today that only exists because of how the work arrives, like retyping or forwarding, that you could simply stop?" },
  trigger: { question: "What is the very first thing that happens today, and where does it land: an inbox, a form, a chat, or a system?" },
  steps: { question: "What does the person doing this today look up before they decide, and which system or file does each piece come from?" },
  decision: { question: "Could a simple rule settle most of these, or does someone need to read each one and use judgement?" },
  action: { question: "When the decision is made, who needs to know, and where should the result be recorded so nobody has to ask?" },
  human: { question: "Which cases would you never want a machine to settle alone, and what would the person checking them need to see?" },
  rank: { question: "If this ran perfectly from Monday, what would people stop doing, and how many hours a week is that?" },
};

export const followUpFixture: FollowUp = {
  questions: [
    { id: "q1", topic: "volume", question: "Roughly how many of these happen in a month?", why: "Volume decides whether this is worth building and how much it saves.", options: ["Under 20", "20 to 100", "100 to 500", "Over 500"] },
    { id: "q2", topic: "data", question: "Is the information the decision needs already written down somewhere reliable?", why: "Automation is only as good as the data it reads.", options: ["Yes, in one system", "Spread across files", "Mostly in people's heads"] },
    { id: "q3", topic: "access", question: "Can your team connect to the systems involved, or does IT need to grant access?", why: "Access is the most common reason automations stall after the workshop.", options: ["We have access", "IT needs to approve", "Not sure"] },
    { id: "q4", topic: "privacy", question: "Does it involve personal data, such as staff or customer details?", why: "Personal data changes where it can be processed and who must approve it.", options: ["Yes", "No", "Not sure"] },
    { id: "q5", topic: "risk", question: "What is the worst thing that happens if a decision is wrong, and how would you notice?", why: "This decides how much a person needs to stay in control.", options: null },
    { id: "q6", topic: "success", question: "How would you know in three months that it worked?", why: "A clear measure makes the business case and keeps the build honest.", options: null },
  ],
};

export const strengthenFixture: Strengthened = {
  summary:
    "This automation takes the repetitive checking and chasing out of the process and leaves people to handle the exceptions. It is worth building, but a few answers are still open, so start with a small pilot.",
  readiness: [
    { key: "value", score: 4, note: "Happens often enough to save real time every week." },
    { key: "data", score: 3, note: "The information exists but is spread across more than one place." },
    { key: "access", score: 2, note: "IT needs to approve access to at least one system." },
    { key: "risk", score: 4, note: "A person still approves anything unusual, so mistakes are caught." },
    { key: "people", score: 3, note: "A process owner is clear, but the people affected need telling." },
  ],
  ai_kind: "classify",
  design: {
    name: "Smart intake and approvals",
    trigger: "A new request arrives through one shared form or inbox, instead of several channels.",
    steps: "Read the request, look up the related record in the main system, and check it is complete; ask for anything missing automatically.",
    decision: "A rule approves the routine cases; AI sorts the rest by type and urgency, with a confidence score.",
    action: "Update the record, confirm to the requester, and log every step so there is a clear audit trail.",
    human: "The process owner approves anything unusual, high-value or low-confidence, and sees the request beside the record before deciding.",
    oversight: "on",
  },
  changes: [
    "Moved everything to one intake channel, so nothing is missed.",
    "Added a completeness check before any decision, because data is spread across files.",
    "Kept a person in control of unusual and low-confidence cases.",
  ],
  risks: [
    { risk: "Access to a key system is delayed.", mitigation: "Ask IT for read-only access in week one and pilot with an export file meanwhile." },
    { risk: "People keep using the old channels.", mitigation: "Announce the change, and auto-reply on old channels with a link to the form." },
  ],
  next_steps: [
    { step: "Confirm the process owner and agree what counts as an unusual case.", who: "Process owner", when: "Week 1" },
    { step: "Request read-only access to the systems involved.", who: "Team lead with IT", when: "Week 1" },
    { step: "Build a pilot with made-up data and test the edge cases.", who: "Automation builder", when: "Weeks 2–3" },
    { step: "Run it alongside the current process for two weeks and compare.", who: "Process owner", when: "Week 4" },
  ],
  open_questions: ["Who signs off on the use of personal data?", "What volume do we expect at month end?"],
  hours_saved_per_month: 24,
  estimates: { cases_per_month: 120, minutes_per_case: 18, automatable_share: 0.65, build_days: 8, running_cost_per_month: 60 },
  ai_act: {
    category: "minimal",
    area: null,
    reason: "It routes and records routine requests and keeps a person deciding anything unusual, so it does not touch a high-risk area.",
    actions: ["Keep a record of what the AI decides and who checks it.", "Re-check if it starts making decisions about people."],
  },
};

export const triageFixture: Triage = {
  tasks: [
    { task: "Chasing missing documents by email", label: "automate", why: "Repetitive reminders on a schedule, easy to track." },
    { task: "Answering the same questions about policies", label: "assist", why: "AI can draft answers from the policy, a person checks the tricky ones." },
    { task: "Typing form details into a spreadsheet", label: "automate", why: "Pure copying between systems." },
    { task: "Difficult conversations with staff", label: "human", why: "Needs judgement, empathy and accountability." },
  ],
  challenges: (caseFixtures as Record<string, { cases: Triage["challenges"] }>).hr.cases.slice(0, 2),
};

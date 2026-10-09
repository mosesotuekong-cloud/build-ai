import type { ReportProse } from "@/lib/ai/schemas/report";
import { RUBRIC, type ScoredCriterion } from "@/lib/ai/schemas/judge";
import { EMPTY_SCORECARD } from "@/lib/discovery/scorecard";
import type { ReportInput, ReportTeamInput } from "./map";

// A sample session for tests, the mock AI and trying the PDF.

const breakdown = (pct: number): ScoredCriterion[] => RUBRIC.map((r) => ({ key: r.key, label: r.label, max: r.max, score: Math.round(r.max * pct), reasoning: "" }));

const team = (t: Partial<ReportTeamInput> & Pick<ReportTeamInput, "id" | "name">): ReportTeamInput => ({
  players: 4,
  case: null,
  design: null,
  score: null,
  assessment: null,
  commitment: null,
  firstFlags: [],
  coachQuestions: 0,
  coachSlots: [],
  ...t,
});

const design = (d: Partial<NonNullable<ReportTeamInput["design"]>>): NonNullable<ReportTeamInput["design"]> => ({
  trigger: "",
  steps: "",
  decision: "",
  action: "",
  human: "",
  name: "",
  hours_saved_per_month: null,
  tools: [],
  systems: [],
  ...EMPTY_SCORECARD,
  ...d,
});

export const sampleReportInput: ReportInput = {
  session: { name: "HR automation sprint", date: "2026-10-08T09:00:00Z", orgName: "Demo Ltd", platforms: ["n8n", "copilot-studio"], beforeAfter: true },
  teams: [
    team({
      id: "t1",
      name: "Night Owls",
      case: { title: "Leave requests by WhatsApp", function_name: "HR", source: "deck" },
      design: design({
        name: "Leave in a minute",
        trigger: "Employee fills in the leave form",
        steps: "Look up the balance in the leave sheet",
        decision: "Rule: approve if the balance covers it and fewer than two teammates are off",
        action: "Confirm on WhatsApp and update the sheet",
        human: "Line manager decides anything the rule can't settle",
        hours_saved_per_month: 20,
        systems: ["Google Sheets"],
        impact: 4,
        effort: 2,
        frequency: "daily",
        data_location: "known",
        data_access: "yes",
        data_quality: "good",
        personal_data: "yes",
        risks: ["people_decisions"],
        ai_kind: "rule",
        platform_fit: "n8n",
      }),
      score: { final: 82, breakdown: breakdown(0.82) },
      assessment: { impact: 4, effort: 2, data_readiness: "ready", risk: "medium", ai_kind: "rule", platform_fit: "n8n", note: "A clear rule handles most requests." },
      commitment: { owner_name: "Ada", first_step: "Ask IT for access to the leave sheet", due_date: "2026-10-20" },
      firstFlags: ["no_human_control", "vague_trigger"],
      coachQuestions: 3,
      coachSlots: ["human", "human", "trigger"],
    }),
    team({
      id: "t2",
      name: "Early Birds",
      case: { title: "Onboarding checklists", function_name: "HR", source: "deck" },
      design: design({
        name: "Day-one ready",
        trigger: "A new hire is created in the HRIS",
        steps: "Pull their role and start date",
        decision: "AI drafts the checklist for the role",
        action: "Send the checklist to IT and the manager",
        human: "HR approves the checklist before it goes out",
        hours_saved_per_month: 12,
        systems: ["Seamless HR"],
        impact: 4,
        effort: 4,
        data_location: "known",
        data_access: "partly",
        data_quality: "messy",
        personal_data: "yes",
        ai_kind: "draft",
      }),
      score: { final: 70, breakdown: breakdown(0.7) },
      assessment: { impact: 4, effort: 4, data_readiness: "not_ready", risk: "low", ai_kind: "draft", platform_fit: "copilot-studio", note: "Valuable, but role data in the HRIS is patchy." },
      firstFlags: ["no_human_control", "missing_data"],
      coachQuestions: 1,
      coachSlots: ["steps"],
    }),
    team({
      id: "t3",
      name: "Lions",
      case: { title: "Payslip questions", function_name: "HR", source: "raised" },
      design: design({ name: "Payslip helper", trigger: "Staff ask about their payslip", decision: "AI answers from the policy", impact: 2, effort: 3, ai_kind: "assistant" }),
      score: { final: 55, breakdown: breakdown(0.55) },
      assessment: { impact: 4, effort: 3, data_readiness: "partly", risk: "high", ai_kind: "assistant", platform_fit: null, note: "Touches pay, so a person must check answers." },
    }),
  ],
  ideas: [
    { title: "Exit interviews", what_happens: "We copy notes from paper forms into a spreadsheet by hand.", who_feels_it: "HR", frequency: "monthly", status: "raised" },
    { title: "Payslip questions", what_happens: "Staff message HR about payslips all week.", who_feels_it: "HR", frequency: "weekly", status: "designed" },
  ],
  checks: [
    { playerId: "p1", kind: "baseline", total: 40, breakdown: breakdown(0.4) },
    { playerId: "p1", kind: "post", total: 70, breakdown: breakdown(0.7) },
    { playerId: "p2", kind: "baseline", total: 60, breakdown: breakdown(0.6) },
    { playerId: "p2", kind: "post", total: 58, breakdown: breakdown(0.58) },
    { playerId: "p3", kind: "baseline", total: 50, breakdown: breakdown(0.5) },
  ],
};

export const sampleReportProse: ReportProse = {
  headline: "Three automations found; leave requests can start this month.",
  summary: [
    "Three teams designed automations worth about 32 hours a month. One is a quick win, one needs its data fixed first, and one can wait.",
    "People got better at designing safe automations: the average solo score rose from 50 to 64.",
  ],
  recommendations: [{ ref: "UC1", text: "Build it now with the team that designed it; the data is ready and the rule is clear." }],
  use_case_notes: [
    { ref: "UC1", note: "A clear rule settles most requests, and the manager decides the rest." },
    { ref: "UC2", note: "Worth doing, but clean up role data in the HRIS first." },
  ],
  learning: "Most teams forgot a human checkpoint until the design check prompted them.",
  next_steps: ["Give the leave team access to the leave sheet.", "Ask HR to tidy role data in the HRIS."],
};

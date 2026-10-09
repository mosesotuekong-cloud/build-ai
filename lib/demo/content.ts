// What a demo sandbox starts with. Written to feel like a real workshop
// half-way through: three teams have designed something, and the visitor's
// own team has made a start.

export const DEMO_STACK = ["n8n", "copilot-studio", "databricks-genie"];
export const DEMO_ROOM_PREFIX = "Demo room: ";
export const DEMO_REPORT_PREFIX = "Sample report: ";

type DemoDesign = {
  name: string;
  trigger: string;
  steps: string;
  decision: string;
  action: string;
  human: string;
  hours_saved_per_month: number | null;
  tools: string[];
  systems: string[];
  impact: number | null;
  effort: number | null;
  frequency: string | null;
  data_location: string | null;
  data_access: string | null;
  data_quality: string | null;
  personal_data: string | null;
  risks: string[];
  ai_kind: string | null;
};

type DemoTeam = { name: string; caseTitle: string; design: DemoDesign };

const blank = { hours_saved_per_month: null, tools: [], systems: [], impact: null, effort: null, frequency: null, data_location: null, data_access: null, data_quality: null, personal_data: null, risks: [], ai_kind: null };

export const VISITOR_TEAM: DemoTeam = {
  name: "Your team",
  caseTitle: "The WhatsApp leave jungle",
  design: {
    ...blank,
    name: "",
    trigger: "An employee asks for leave",
    steps: "",
    decision: "",
    action: "",
    human: "",
  },
};

export const BOT_TEAMS: DemoTeam[] = [
  {
    name: "Night Owls",
    caseTitle: "The onboarding document chase",
    design: {
      name: "Day-one ready",
      trigger: "HR marks an offer as accepted in the hiring tracker",
      steps: "Send the new hire a form for ID, guarantor, bank details and certificates; collect the uploads in one folder",
      decision: "Rule: if every document is in three days before the start date, go ahead; if not, chase",
      action: "Ask IT to set up email and access for day one, and send a polite reminder for anything missing",
      human: "HR checks the documents are genuine before the start date",
      hours_saved_per_month: 16,
      tools: ["n8n", "Gmail"],
      systems: ["Hiring tracker", "Google Drive"],
      impact: 4,
      effort: 2,
      frequency: "weekly",
      data_location: "known",
      data_access: "yes",
      data_quality: "good",
      personal_data: "yes",
      risks: ["people_decisions"],
      ai_kind: "rule",
    },
  },
  {
    name: "Early Birds",
    caseTitle: "The month-end HR report scramble",
    design: {
      name: "Report in an hour",
      trigger: "The last working day of the month",
      steps: "Pull headcount, hires, exits and absence from the four HR spreadsheets into one table",
      decision: "AI writes a short summary of what changed and flags numbers that don't match between sheets",
      action: "Build the management slide and email it to the HR manager",
      human: "The HR manager checks the flagged numbers and approves the slide before it goes to leadership",
      hours_saved_per_month: 14,
      tools: ["Copilot Studio", "Excel"],
      systems: ["HR spreadsheets"],
      impact: 4,
      effort: 3,
      frequency: "monthly",
      data_location: "known",
      data_access: "partly",
      data_quality: "messy",
      personal_data: "no",
      risks: [],
      ai_kind: "summarise",
    },
  },
  {
    name: "Lions",
    caseTitle: 'The "quick question" inbox',
    design: {
      name: "Ask HR bot",
      trigger: "An employee sends a question to the HR WhatsApp number",
      steps: "Look up the HR policy handbook and the employee's leave balance",
      decision: "AI answers common policy questions; anything about pay or a complaint goes to a person",
      action: "Reply on WhatsApp with the answer and a link to the policy",
      human: "An HR officer answers anything the bot hands over, and reviews a sample of answers each week",
      hours_saved_per_month: 20,
      tools: ["WhatsApp"],
      systems: ["Policy handbook", "Leave spreadsheet"],
      impact: 3,
      effort: 4,
      frequency: "daily",
      data_location: "known",
      data_access: "yes",
      data_quality: "messy",
      personal_data: "yes",
      risks: ["customer_facing", "pay"],
      ai_kind: "assistant",
    },
  },
];

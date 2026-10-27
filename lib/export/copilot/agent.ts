import { oversightLabel } from "@/lib/ai/schemas/canvas";
import type { CoachDesign } from "@/lib/coach/context";
import { circleIcon } from "../png";
import { idMaker } from "../ids";
import { orderBlocks, type Plan } from "../plan";
import { zip } from "../zip";

// A Microsoft 365 Copilot declarative agent built from the team's design: an
// app package (Teams app manifest, agent manifest and two icons) that can be
// uploaded in Teams or the Microsoft 365 admin centre, or opened in the
// Microsoft 365 Agents Toolkit. The agent helps the people who run the
// workflow: it applies the team's rules, prepares the facts and drafts
// messages, and leaves every decision the design gives a person to that
// person.
//
// It declares no data capabilities, so it works in Copilot Chat without
// extra licences; builders add SharePoint, email or Teams knowledge later.

export const DA_SCHEMA = "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.5/schema.json";
export const APP_SCHEMA = "https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json";

const cut = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

export type DeclarativeAgent = {
  $schema: string;
  version: "v1.5";
  name: string;
  description: string;
  instructions: string;
  conversation_starters: { title: string; text: string }[];
  disclaimer: { text: string };
};

export function declarativeAgent(input: { plan: Plan; design: CoachDesign; challenge?: string | null }): DeclarativeAgent {
  const { plan, design } = input;
  const name = design.name || plan.name;
  const steps = orderBlocks(plan);
  const human = design.human.trim() || steps.filter((b) => b.kind === "approval").map((b) => b.note || b.message || b.label).join(" ");
  const sections = [
    `# Role`,
    `You help the team that runs "${name}". ${plan.summary}`,
    input.challenge ? `The problem it solves: ${input.challenge}` : "",
    ``,
    `# How the work flows`,
    ...steps.map((b, i) => `${i + 1}. ${b.label}${b.note ? `: ${b.note}` : ""}`),
    ``,
    `# The rules you apply`,
    design.decision.trim() || steps.filter((b) => b.kind === "if" || b.kind === "switch").map((b) => b.condition || b.label).join(" ") || "Follow the team's written rules. Ask for them if you don't have them.",
    ``,
    `# Where a person decides`,
    `${oversightLabel(design.oversight) ? `${oversightLabel(design.oversight)}. ` : ""}${human || "A named person makes every decision that affects people, money or records."}`,
    `You never make or announce those decisions yourself. Prepare the facts, show your reasoning and recommend; the person decides.`,
    ``,
    `# How you answer`,
    `- Use British English. Be brief and specific; lead with the answer.`,
    `- When you check a case, list what matches, what doesn't, and what's missing.`,
    `- If information is missing or you're unsure, say so plainly and say who should decide.`,
    `- When you draft a message to a customer or colleague, mark it as a draft for a person to check before sending.`,
    `- Only use the personal details the task needs. Don't repeat bank details, passwords or ID numbers back.`,
  ];
  const instructions = cut(sections.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n"), 8000);

  const starters = [
    { title: "Check a case", text: `Check this case against the rules for ${name}: ` },
    { title: "What needs a person?", text: "Which parts of this workflow need a person to decide, and why?" },
    { title: "Explain the flow", text: `Walk me through how ${name} works, step by step.` },
  ];
  const message = steps.find((b) => ["outlook_send", "gmail_send", "whatsapp_send", "slack_send"].includes(b.kind));
  if (message) starters.push({ title: "Draft a message", text: `Draft the "${message.label}" message for me to check.` });
  starters.push({ title: "Spot the risks", text: "What could go wrong with this case, and what should I check first?" });

  return {
    $schema: DA_SCHEMA,
    version: "v1.5",
    name: cut(name, 100),
    description: cut(`Helps run ${name}: ${plan.summary}`, 1000),
    instructions,
    conversation_starters: starters.slice(0, 12),
    disclaimer: { text: cut(`AI assistant built with Builda. It prepares and recommends; ${human ? "the named person makes the decision" : "a person makes every decision"}. Check before you act.`, 500) },
  };
}

export function copilotAgentPackage(input: { plan: Plan; design: CoachDesign; challenge?: string | null }): Buffer {
  const agent = declarativeAgent(input);
  const id = idMaker(`copilot:${input.plan.name}`)();
  const manifest = {
    $schema: APP_SCHEMA,
    manifestVersion: "1.19",
    version: "1.0.0",
    id,
    developer: { name: "Builda", websiteUrl: "https://gidibuilda.com", privacyUrl: "https://gidibuilda.com/privacy", termsOfUseUrl: "https://gidibuilda.com/privacy" },
    icons: { color: "color.png", outline: "outline.png" },
    name: { short: cut(agent.name, 30), full: cut(agent.name, 100) },
    description: { short: cut(`Helps run ${agent.name}`, 80), full: cut(agent.description, 4000) },
    accentColor: "#E8590C",
    copilotAgents: { declarativeAgents: [{ id: "declarativeAgent", file: "declarativeAgent.json" }] },
    permissions: ["identity", "messageTeamMembers"],
    validDomains: [],
  };
  return zip([
    { path: "manifest.json", data: JSON.stringify(manifest, null, 2) },
    { path: "declarativeAgent.json", data: JSON.stringify(agent, null, 2) },
    { path: "color.png", data: circleIcon(192, [232, 89, 12, 255], [255, 255, 255, 255]) },
    { path: "outline.png", data: circleIcon(32, [0, 0, 0, 0], [255, 255, 255, 255]) },
  ]);
}

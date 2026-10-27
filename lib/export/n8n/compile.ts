import type { WorkflowCompiler } from "../compiler";
import { idMaker } from "../ids";
import { orderBlocks, validatePlan, type Plan, type PlanBlock } from "../plan";
import * as T from "./templates";

// The n8n compiler: a deterministic translation of a validated plan into n8n
// workflow JSON, using only the node templates in ./templates. The same plan
// always produces the same file.

export type N8nNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  webhookId?: string;
  notes?: string;
  notesInFlow?: boolean;
};
type Target = { node: string; type: string; index: number };
export type N8nWorkflow = {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, Record<string, Target[][]>>;
  pinData: Record<string, never>;
  settings: { executionOrder: "v1" };
};

const COL = 300;
const ROW = 220;
const STICKY = { setup: 4, human: 3, fill: 1 } as const;

const SERVICE_LABEL: Partial<Record<string, string>> = {
  [T.N8N_TYPES.gmail.type]: "Gmail (Google account)",
  [T.N8N_TYPES.outlook.type]: "Microsoft Outlook",
  [T.N8N_TYPES.sheets.type]: "Google Sheets (Google account)",
  [T.N8N_TYPES.whatsApp.type]: "WhatsApp Business Cloud",
  [T.N8N_TYPES.slack.type]: "Slack",
  [T.N8N_TYPES.chatModel.type]: "OpenAI (or swap the chat model for the one your organisation uses)",
};

const replace = (what: string | null, fallback: string) => `${T.REPLACE}: ${what?.trim() || fallback}`;

export function compileN8n(plan: Plan): N8nWorkflow {
  const problems = validatePlan(plan, { requireApproval: false });
  if (problems.length) throw new Error(`Cannot compile an invalid plan: ${problems.join(" ")}`);

  const ids = idMaker(plan.name + JSON.stringify(plan.blocks.map((b) => b.id)));
  const nodes: N8nNode[] = [];
  const connections: N8nWorkflow["connections"] = {};
  const usedNames = new Set<string>();
  const uniqueName = (label: string) => {
    const base = label.replace(/\s+/g, " ").trim().slice(0, 60) || "Step";
    let name = base;
    for (let i = 2; usedNames.has(name); i++) name = `${base} ${i}`;
    usedNames.add(name);
    return name;
  };
  const connect = (from: string, outIndex: number, to: string, type = "main", toIndex = 0) => {
    const outputs = (connections[from] ??= {});
    const list = (outputs[type] ??= []);
    while (list.length <= outIndex) list.push([]);
    list[outIndex].push({ node: to, type, index: toIndex });
  };

  // Layout: column = longest path from the trigger; rows stack within a column.
  const ordered = orderBlocks(plan);
  const depth = new Map<string, number>();
  for (const b of ordered) {
    const incoming = plan.links.filter((l) => l.to === b.id).map((l) => (depth.get(l.from) ?? 0) + 1);
    depth.set(b.id, Math.max(0, ...incoming));
  }
  // Blocks that compile to two nodes (approval + IF) push later columns right.
  const extraCols = (b: PlanBlock) => (b.kind === "approval" && plan.links.some((l) => l.from === b.id && l.branch) ? 1 : 0);
  const colOffset = new Map<string, number>();
  for (const b of ordered) {
    const incoming = plan.links.filter((l) => l.to === b.id).map((l) => {
      const from = plan.blocks.find((x) => x.id === l.from)!;
      return (colOffset.get(l.from) ?? 0) + extraCols(from);
    });
    colOffset.set(b.id, Math.max(0, ...incoming));
  }
  const rowsUsed = new Map<number, number>();
  const place = (col: number, rowSpan = 1): [number, number] => {
    const row = rowsUsed.get(col) ?? 0;
    rowsUsed.set(col, row + rowSpan);
    return [col * COL, row * ROW];
  };

  const add = (label: string, tpl: T.NodeTemplate, position: [number, number], notes?: string): string => {
    const name = uniqueName(label);
    nodes.push({
      id: ids(),
      name,
      type: tpl.type,
      typeVersion: tpl.typeVersion,
      position,
      parameters: tpl.parameters,
      ...(tpl.needsWebhookId ? { webhookId: ids() } : {}),
      ...(notes ? { notes, notesInFlow: false } : {}),
    });
    return name;
  };

  const stickies: { content: string; position: [number, number]; color: number; height: number }[] = [];
  const entry = new Map<string, string>();
  const exits = new Map<string, Map<string | null, { node: string; index: number }>>();
  const placeholders = new Set<string>();

  for (const b of ordered) {
    const col = (depth.get(b.id) ?? 0) + (colOffset.get(b.id) ?? 0);
    const outLinks = plan.links.filter((l) => l.from === b.id);
    const fromAgent = plan.links
      .filter((l) => l.to === b.id)
      .map((l) => plan.blocks.find((x) => x.id === l.from)!)
      .find((x) => x.kind === "ai_agent" && x.outputs?.length);
    const agentField = fromAgent ? `$json.output.${T.fieldName(fromAgent.outputs![0])}` : null;
    const notes = [b.note, b.condition && `Rule: ${b.condition}`].filter(Boolean).join("\n");
    const out = new Map<string | null, { node: string; index: number }>();
    let name: string;

    switch (b.kind) {
      case "form_trigger":
        name = add(b.label, T.formTrigger(b.label, b.note, b.fields?.length ? b.fields : ["Name", "Email", "Details"]), place(col), notes);
        break;
      case "schedule_trigger":
        name = add(b.label, T.scheduleTrigger(), place(col), notes);
        stickies.push({ content: `## Set the schedule\nThe team wanted: **${b.schedule || b.note || "a regular run"}**.\nThis starter runs every weekday at 9am. Change it in the trigger.`, position: [col * COL - 40, -300], color: STICKY.fill, height: 220 });
        break;
      case "webhook":
        name = add(b.label, T.webhook(T.fieldName(plan.name).replace(/_/g, "-")), place(col), notes);
        stickies.push({ content: `## Connect the starting system\n${b.system ? `Ask **${b.system}**` : "Ask the system where this starts"} to call this webhook's production URL when the event happens.`, position: [col * COL - 40, -300], color: STICKY.fill, height: 220 });
        break;
      case "gmail_send":
        name = add(b.label, T.gmailSend(replace(b.to, "recipient's email"), b.subject || b.label, b.message || b.note), place(col), notes);
        placeholders.add("recipient email addresses");
        break;
      case "outlook_send":
        name = add(b.label, T.outlookSend(replace(b.to, "recipient's email"), b.subject || b.label, b.message || b.note), place(col), notes);
        placeholders.add("recipient email addresses");
        break;
      case "sheets_read":
        name = add(b.label, T.sheetsRead(b.label), place(col), notes);
        placeholders.add("the spreadsheet and sheet names");
        break;
      case "sheets_append":
        name = add(b.label, T.sheetsAppend(b.label, b.fields?.length ? b.fields : ["Date", "Outcome"]), place(col), notes);
        placeholders.add("the spreadsheet and sheet names");
        break;
      case "whatsapp_send":
        name = add(b.label, T.whatsAppSend(replace(b.to, "recipient's phone number with country code"), b.message || b.note), place(col), notes);
        placeholders.add("the WhatsApp phone number ID and recipient numbers");
        break;
      case "slack_send":
        name = add(b.label, T.slackPost(b.message || b.note), place(col), notes);
        placeholders.add("the Slack channel");
        break;
      case "set_fields":
        name = add(b.label, T.setFields(ids, b.fields?.length ? b.fields : ["summary"]), place(col), notes);
        placeholders.add("the field values in Edit Fields");
        break;
      case "http_request":
        name = add(b.label, T.httpRequest(b.system || b.label), place(col), notes);
        placeholders.add(`the ${b.system || "system"} API address and login`);
        stickies.push({
          content: `## Connect ${b.system || "your system"}\nn8n has no ready-made node for **${b.system || "this system"}**, so this is an HTTP Request.\n1. Ask its owner for the API address and how to log in.\n2. Replace the URL and set Authentication.\n\nWhat it should do: ${b.message || b.note || b.label}`,
          position: [col * COL - 40, -340],
          color: STICKY.fill,
          height: 260,
        });
        break;
      case "if":
        name = add(b.label, T.ifNode(ids, agentField ? T.expr(agentField) : T.expr(`$json.${T.REPLACE}_condition`)), place(col), notes);
        if (!agentField) placeholders.add("the IF rule");
        break;
      case "switch": {
        const withFallback = outLinks.some((l) => l.branch === "otherwise");
        name = add(b.label, T.switchNode(ids, agentField ? T.expr(agentField) : T.expr(`$json.${T.REPLACE}_outcome`), b.cases!, withFallback), place(col), notes);
        if (!agentField) placeholders.add("the Switch value");
        b.cases!.forEach((c, i) => out.set(c, { node: name, index: i }));
        if (withFallback) out.set("otherwise", { node: name, index: b.cases!.length });
        break;
      }
      case "ai_agent": {
        const outputs = b.outputs?.length ? b.outputs : ["outcome", "reason"];
        const pos = place(col, 2);
        name = add(
          b.label,
          T.agent(
            `=${b.message || b.note}\n\nHere is the item:\n{{ JSON.stringify($json) }}`,
            `You help with this workflow: ${(plan.summary || plan.name).replace(/[.\s]+$/, "")}. Return only the fields asked for. If you are unsure, say so in the reason and leave the decision to a person.`,
          ),
          pos,
          notes,
        );
        const model = add(`${b.label} model`, T.chatModel(), [pos[0] - 60, pos[1] + 200]);
        const parser = add(`${b.label} output`, T.outputParser(outputs), [pos[0] + 120, pos[1] + 200]);
        connect(model, 0, name, "ai_languageModel");
        connect(parser, 0, name, "ai_outputParser");
        break;
      }
      case "approval": {
        const branched = outLinks.some((l) => l.branch);
        const double = outLinks.some((l) => l.branch === "declined");
        const channel = b.channel ?? "email";
        name = add(b.label, T.approval(channel, replace(b.to, channel === "whatsapp" ? "approver's phone number" : "approver's email"), `Please review: ${plan.name}`, b.message || b.note, double), place(col), notes);
        placeholders.add(channel === "slack" ? "the Slack approver" : "the approver's address");
        stickies.push({
          content: `## Human in control\n${b.note || b.message || "A person decides here."}\n\nThe workflow waits here (up to 2 days) until they answer. Nothing after this runs without them.${channel === "email" ? "\n\nUsing Outlook? n8n's Outlook node can't wait for an answer; use Gmail, Slack or Teams for this step." : ""}`,
          position: [col * COL - 40, -340],
          color: STICKY.human,
          height: 260,
        });
        out.set(null, { node: name, index: 0 });
        if (branched) {
          const check = add(`${b.label}: approved?`, T.ifNode(ids, T.expr("$json.data.approved")), place(col + 1));
          connect(name, 0, check);
          out.set("approved", { node: check, index: 0 });
          out.set("declined", { node: check, index: 1 });
        }
        break;
      }
    }

    entry.set(b.id, name!);
    if (b.kind === "if") {
      out.set("true", { node: name!, index: 0 });
      out.set("false", { node: name!, index: 1 });
    }
    if (!out.has(null) && !["if", "switch"].includes(b.kind)) out.set(null, { node: name!, index: 0 });
    exits.set(b.id, out);
  }

  for (const l of plan.links) {
    const from = exits.get(l.from)!.get(l.branch) ?? exits.get(l.from)!.get(null)!;
    connect(from.node, from.index, entry.get(l.to)!);
  }

  // The setup note, top left.
  const services = [...new Set(nodes.map((n) => SERVICE_LABEL[n.type]).filter(Boolean))];
  const setup = [
    `## ${plan.name}: starter workflow`,
    "Made with Builda from your team's design. **This is a starting point, not a finished build.**",
    "",
    "### Before you run it",
    services.length ? `1. Connect your own accounts (credentials are empty): ${services.join(", ")}.` : "1. No app accounts are needed for this starter.",
    `2. Replace every value that starts with **${T.REPLACE}**: ${[...placeholders].join(", ") || "none"}.`,
    "3. Test it with made-up data before it touches real people.",
    "",
    plan.summary && `### What it does\n${plan.summary}`,
  ]
    .filter((x) => x !== "")
    .join("\n");
  stickies.unshift({ content: setup, position: [-620, -340], color: STICKY.setup, height: 520 });

  for (const s of stickies) {
    const tpl = T.stickyNote(s.content, s.color === STICKY.setup ? 520 : 260, s.height, s.color);
    nodes.push({ id: ids(), name: uniqueName("Sticky Note"), type: tpl.type, typeVersion: tpl.typeVersion, position: s.position, parameters: tpl.parameters });
  }

  return { name: `${plan.name} (Builda starter)`, nodes, connections, pinData: {}, settings: { executionOrder: "v1" } };
}

export const n8nCompiler: WorkflowCompiler = {
  platform: "n8n",
  fileExtension: "json",
  mimeType: "application/json",
  compile: (plan) => JSON.stringify(compileN8n(plan), null, 2),
};

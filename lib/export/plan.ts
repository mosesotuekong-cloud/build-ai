import { z } from "zod";
import { canvasSlotSchema } from "@/lib/ai/schemas/canvas";

// The tool-neutral plan: a team's design as a small graph of blocks from an
// allowlisted catalog. It is the source of truth for every export. The AI
// writes it (validated here); compilers in lib/export/<platform>/ turn it
// into files. The AI never writes platform JSON directly.

export const BLOCK_KINDS = [
  "form_trigger",
  "schedule_trigger",
  "webhook",
  "gmail_send",
  "outlook_send",
  "sheets_read",
  "sheets_append",
  "whatsapp_send",
  "slack_send",
  "if",
  "switch",
  "ai_agent",
  "http_request",
  "approval",
  "set_fields",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export const TRIGGER_KINDS: BlockKind[] = ["form_trigger", "schedule_trigger", "webhook"];

export const BLOCK_CATALOG: Record<BlockKind, string> = {
  form_trigger: "A web form someone fills in starts the workflow. Set `fields` to the form questions.",
  schedule_trigger: "Starts on a timetable. Set `schedule` to a plain description, e.g. 'every weekday at 9am'.",
  webhook: "Another system calls a URL to start the workflow (for example 'new hire created in the HRIS'). Set `system`.",
  gmail_send: "Sends an email from Gmail. Set `to`, `subject` and `message`.",
  outlook_send: "Sends an email from Outlook. Set `to`, `subject` and `message`.",
  sheets_read: "Looks up rows in a Google Sheet. Set `fields` to the columns it needs.",
  sheets_append: "Adds a row to a Google Sheet (a log or a record). Set `fields` to the columns.",
  whatsapp_send: "Sends a WhatsApp Business message. Set `to` and `message`.",
  slack_send: "Posts a Slack message. Set `to` (a channel or person) and `message`.",
  if: "A yes/no rule. Set `condition` in plain words. Its outgoing links must use branch 'true' or 'false'.",
  switch: "Routes to one of several paths. Set `cases` to the outcomes. Outgoing links use branch = one of the cases, or 'otherwise'.",
  ai_agent: "AI reads something and returns structured fields. Set `message` (the instruction) and `outputs` (field names it returns).",
  http_request: "Talks to a system that has no block (for example a local HRIS or payroll). Set `system` and `message` (what it fetches or sends).",
  approval: "Sends a message to a person and waits for them to approve or decline. Set `channel`, `to` and `message`. Outgoing links may use branch 'approved' or 'declined'.",
  set_fields: "Prepares or tidies data. Set `fields` to the field names it creates.",
};

const text = (max: number) => z.string().trim().max(max);

export const planBlockSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Block ids are short snake_case names."),
  kind: z.enum(BLOCK_KINDS),
  slot: canvasSlotSchema,
  label: text(60).min(1),
  note: text(400),
  fields: z.array(text(60).min(1)).max(12).nullable(),
  schedule: text(120).nullable(),
  to: text(120).nullable(),
  subject: text(150).nullable(),
  message: text(1500).nullable(),
  condition: text(300).nullable(),
  cases: z.array(text(40).min(1)).max(6).nullable(),
  outputs: z.array(text(40).min(1)).max(8).nullable(),
  system: text(80).nullable(),
  channel: z.enum(["email", "slack", "whatsapp"]).nullable(),
});
export type PlanBlock = z.infer<typeof planBlockSchema>;

export const planLinkSchema = z.object({
  from: z.string(),
  to: z.string(),
  branch: text(40).nullable(),
});
export type PlanLink = z.infer<typeof planLinkSchema>;

export const planSchema = z.object({
  name: text(80).min(1),
  summary: text(500),
  blocks: z.array(planBlockSchema).min(2).max(16),
  links: z.array(planLinkSchema).max(30),
});
export type Plan = z.infer<typeof planSchema>;

// A block with every optional field empty, for building plans in code.
export function block(b: Pick<PlanBlock, "id" | "kind" | "slot" | "label"> & Partial<PlanBlock>): PlanBlock {
  return {
    note: "",
    fields: null,
    schedule: null,
    to: null,
    subject: null,
    message: null,
    condition: null,
    cases: null,
    outputs: null,
    system: null,
    channel: null,
    ...b,
  };
}

export const link = (from: string, to: string, branch: string | null = null): PlanLink => ({ from, to, branch });

// The branches each block kind may use on its outgoing links.
export function allowedBranches(b: PlanBlock): (string | null)[] {
  switch (b.kind) {
    case "if":
      return ["true", "false"];
    case "switch":
      return [...(b.cases ?? []), "otherwise"];
    case "approval":
      return [null, "approved", "declined"];
    default:
      return [null];
  }
}

// Checks what zod can't: links point at real blocks, one trigger starts the
// flow, everything is reachable, no loops, branches fit the block, and a
// person stays in control. Returns a list of problems (empty means valid).
export function validatePlan(plan: Plan): string[] {
  const problems: string[] = [];
  const byId = new Map<string, PlanBlock>();
  for (const b of plan.blocks) {
    if (byId.has(b.id)) problems.push(`Duplicate block id "${b.id}".`);
    byId.set(b.id, b);
  }

  const triggers = plan.blocks.filter((b) => TRIGGER_KINDS.includes(b.kind));
  if (triggers.length !== 1) problems.push(`Expected exactly one trigger block, found ${triggers.length}.`);
  if (!plan.blocks.some((b) => b.kind === "approval")) problems.push("No approval block: a person must stay in control.");

  const seen = new Set<string>();
  for (const l of plan.links) {
    const from = byId.get(l.from);
    if (!from) problems.push(`Link from unknown block "${l.from}".`);
    if (!byId.has(l.to)) problems.push(`Link to unknown block "${l.to}".`);
    if (l.from === l.to) problems.push(`Block "${l.from}" links to itself.`);
    if (from && !allowedBranches(from).includes(l.branch)) problems.push(`Branch "${l.branch}" is not valid after ${from.kind} "${from.id}".`);
    if (byId.has(l.to) && TRIGGER_KINDS.includes(byId.get(l.to)!.kind)) problems.push(`Trigger "${l.to}" cannot have incoming links.`);
    const key = `${l.from}>${l.to}>${l.branch}`;
    if (seen.has(key)) problems.push(`Duplicate link ${l.from} → ${l.to}.`);
    seen.add(key);
  }

  for (const b of plan.blocks) {
    if (b.kind === "switch" && !(b.cases && b.cases.length >= 2)) problems.push(`Switch "${b.id}" needs at least two cases.`);
    if (b.kind === "switch" && b.cases && new Set(b.cases.map((c) => c.toLowerCase())).size !== b.cases.length) problems.push(`Switch "${b.id}" repeats a case.`);
    if (b.kind === "if" && !plan.links.some((l) => l.from === b.id)) problems.push(`IF "${b.id}" leads nowhere.`);
  }

  if (problems.length) return problems;

  // Reachability from the trigger, and no cycles (depth-first search).
  const out = new Map<string, string[]>();
  for (const l of plan.links) out.set(l.from, [...(out.get(l.from) ?? []), l.to]);
  const state = new Map<string, "visiting" | "done">();
  let cycle = false;
  const visit = (id: string) => {
    if (state.get(id) === "visiting") {
      cycle = true;
      return;
    }
    if (state.get(id) === "done") return;
    state.set(id, "visiting");
    for (const next of out.get(id) ?? []) visit(next);
    state.set(id, "done");
  };
  visit(triggers[0].id);
  if (cycle) problems.push("The plan loops back on itself.");
  const unreachable = plan.blocks.filter((b) => !state.has(b.id)).map((b) => b.id);
  if (unreachable.length) problems.push(`Not connected to the trigger: ${unreachable.join(", ")}.`);
  return problems;
}

// Topological order from the trigger (the plan has been validated).
export function orderBlocks(plan: Plan): PlanBlock[] {
  const indegree = new Map(plan.blocks.map((b) => [b.id, 0]));
  for (const l of plan.links) indegree.set(l.to, (indegree.get(l.to) ?? 0) + 1);
  const queue = plan.blocks.filter((b) => indegree.get(b.id) === 0);
  const ordered: PlanBlock[] = [];
  while (queue.length) {
    const b = queue.shift()!;
    ordered.push(b);
    for (const l of plan.links.filter((x) => x.from === b.id)) {
      indegree.set(l.to, indegree.get(l.to)! - 1);
      if (indegree.get(l.to) === 0) queue.push(plan.blocks.find((x) => x.id === l.to)!);
    }
  }
  return ordered;
}

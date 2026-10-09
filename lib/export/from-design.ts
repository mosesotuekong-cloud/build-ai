import type { CoachDesign } from "@/lib/coach/context";
import { block, link, type Plan, type PlanBlock, type PlanLink } from "./plan";

// The rule-based fallback: turns a design into a plan without the AI, so the
// download always works. It reads the slot text and the team's tools and
// systems for well-known names; anything else becomes an HTTP Request.

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(text));

const KNOWN = /gmail|google mail|outlook|office 365|microsoft 365|google sheets?|sheets|excel|whatsapp|slack|email|e-mail/i;

function short(text: string, max = 60) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function channelOf(text: string): "slack" | "whatsapp" | "email" {
  if (has(text, "slack")) return "slack";
  if (has(text, "whatsapp")) return "whatsapp";
  return "email";
}

export function planFromDesign(design: CoachDesign): Plan {
  const all = [design.trigger, design.steps, design.decision, design.action, design.human, ...design.tools, ...design.systems].join(" \n ");
  const blocks: PlanBlock[] = [];
  const links: PlanLink[] = [];

  // Trigger
  const triggerText = design.trigger || "Something starts the process";
  if (has(triggerText, "every", "daily", "weekly", "monthly", "each (day|week|month)", "schedule", "monday", "friday", "morning", "end of")) {
    blocks.push(block({ id: "start", kind: "schedule_trigger", slot: "trigger", label: "On a schedule", schedule: triggerText, note: triggerText }));
  } else if (has(triggerText, "form", "request", "submit", "appl", "fill")) {
    blocks.push(block({ id: "start", kind: "form_trigger", slot: "trigger", label: "Request form", fields: ["Name", "Email", "Details"], note: triggerText }));
  } else {
    const system = design.systems.find((s) => !KNOWN.test(s)) ?? null;
    blocks.push(block({ id: "start", kind: "webhook", slot: "trigger", label: "When it happens", system, note: triggerText }));
  }
  let last = "start";
  const chain = (b: PlanBlock, branch: string | null = null) => {
    blocks.push(b);
    links.push(link(last, b.id, branch));
    last = b.id;
  };

  // Steps: look things up in the systems the team named.
  const stepSystems = design.systems.filter((s) => !KNOWN.test(s)).slice(0, 2);
  if (has(all, "google sheets?", "spreadsheet", "sheet")) {
    chain(block({ id: "look_up", kind: "sheets_read", slot: "steps", label: "Look up the records", fields: ["Name", "Status"], note: design.steps }));
  }
  stepSystems.forEach((system, i) =>
    chain(
      block({
        id: `fetch_${i + 1}`,
        kind: "http_request",
        slot: "steps",
        label: short(`Get data from ${system}`),
        system,
        message: design.steps || `Fetch what the decision needs from ${system}.`,
        note: design.steps,
      }),
    ),
  );
  if (last === "start") {
    chain(block({ id: "gather", kind: "set_fields", slot: "steps", label: "Gather the details", fields: ["summary"], note: design.steps }));
  }

  // Decision: AI when the team says so, otherwise a rule.
  const decisionText = design.decision || "Decide what happens next";
  if (has(decisionText, "ai", "score", "classif", "judge", "read", "summar", "analys", "assess", "predict", "extract")) {
    chain(
      block({
        id: "ai_review",
        kind: "ai_agent",
        slot: "decision",
        label: "AI review",
        message: decisionText,
        outputs: ["needs_person", "reason"],
        note: decisionText,
      }),
    );
  }
  chain(block({ id: "decide", kind: "if", slot: "decision", label: "Can the rule settle it?", condition: decisionText, note: decisionText }));

  // Action
  const actionText = `${design.action} ${design.tools.join(" ")}`;
  const actionKind: PlanBlock["kind"] = has(actionText, "whatsapp")
    ? "whatsapp_send"
    : has(actionText, "slack")
      ? "slack_send"
      : has(actionText, "outlook", "office 365", "microsoft 365", "teams")
        ? "outlook_send"
        : "gmail_send";
  const action = block({
    id: "act",
    kind: actionKind,
    slot: "action",
    label: short(design.action || "Send the outcome", 50),
    to: "the person this is for",
    subject: design.name || "An update for you",
    message: design.action || "Here is the outcome.",
    note: design.action,
  });
  blocks.push(action);
  links.push(link("decide", "act", "true"));

  // Human in control
  const humanText = design.human || "A person checks before anything goes out";
  blocks.push(
    block({
      id: "approve",
      kind: "approval",
      slot: "human",
      label: "A person decides",
      channel: channelOf(`${humanText} ${design.tools.join(" ")}`),
      to: "the person in control",
      message: humanText,
      note: humanText,
    }),
  );
  links.push(link("decide", "approve", "false"), link("approve", "act", "approved"));

  if (has(`${design.action} ${design.steps}`, "record", "log", "sheet", "register", "track")) {
    blocks.push(block({ id: "record", kind: "sheets_append", slot: "action", label: "Keep a record", fields: ["Date", "Outcome"], note: "Logs what happened." }));
    links.push(link("act", "record"));
  }

  return {
    name: short(design.name || "My automation", 80),
    summary: [design.trigger, design.decision, design.action].filter(Boolean).join(" → ").slice(0, 500),
    blocks,
    links,
  };
}

import { TRIGGER_KINDS, orderBlocks, type Plan, type PlanBlock } from "./plan";

// The data-platform translation shared by Databricks and Fabric. Neither has
// a "wait for a person" step, so a plan becomes two notebooks:
//
//   1. prepare: reads new cases, runs the steps and rules, does what needs no
//      person, and puts every case that needs one into a review table;
//   2. apply decisions: picks up the cases people have decided and does what
//      the plan says for approved and declined ones.
//
// Each case carries its routing in columns (route_<block>), so every block
// runs on exactly the cases whose path reaches it. Messages go to an outbox
// table until a sender is connected, so nothing reaches a real person by
// accident. Placeholders fail loudly with need(), never silently.

export type Cell = { kind: "md" | "code"; text: string };

export type Dialect = {
  name: "Databricks" | "Fabric";
  setup: () => string;
  ai: (block: PlanBlock, rows: string, outputs: string[]) => string;
  secret: (key: string) => string;
};

const py = (s: string) => JSON.stringify(s);
export const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "workflow";

type Conds = { prep: string | null; apply: string | null };
const or = (a: string | null, b: string | null) => (a && b ? (a === "true" || b === "true" ? "true" : `(${a}) OR (${b})`) : a ?? b);
const and = (a: string, b: string) => (a === "true" ? b : b === "true" ? a : `(${a}) AND (${b})`);

// Which cases reach each block, in each notebook, as a SQL condition (null:
// the block doesn't run in that notebook).
export function routing(plan: Plan): Map<string, Conds> {
  const conds = new Map<string, Conds>();
  const byId = new Map(plan.blocks.map((b) => [b.id, b]));
  const branchSql = (from: PlanBlock, branch: string | null): string => {
    if (from.kind === "if") return `route_${from.id} = ${branch === "false" ? "false" : "true"}`;
    if (from.kind === "switch") {
      if (branch === "otherwise") return `route_${from.id} NOT IN (${(from.cases ?? []).map((c) => `'${c.replace(/'/g, "")}'`).join(", ")})`;
      return `route_${from.id} = '${(branch ?? "").replace(/'/g, "")}'`;
    }
    return "true";
  };
  for (const b of orderBlocks(plan)) {
    if (TRIGGER_KINDS.includes(b.kind)) {
      conds.set(b.id, { prep: "true", apply: null });
      continue;
    }
    let prep: string | null = null;
    let apply: string | null = null;
    for (const l of plan.links.filter((x) => x.to === b.id)) {
      const from = byId.get(l.from)!;
      const c = conds.get(from.id)!;
      if (from.kind === "approval") {
        // Cases come back from review with the person's decision.
        const decision = l.branch === "declined" ? "declined" : "approved";
        apply = or(apply, `approval_step = '${from.id}' AND decision = '${decision}'`);
        continue;
      }
      if (c.prep) prep = or(prep, and(c.prep, branchSql(from, l.branch)));
      if (c.apply) apply = or(apply, and(c.apply, branchSql(from, l.branch)));
    }
    conds.set(b.id, { prep, apply });
  }
  return conds;
}

const OUTBOX_KINDS: Partial<Record<PlanBlock["kind"], string>> = { gmail_send: "email", outlook_send: "email", whatsapp_send: "whatsapp", slack_send: "slack" };

function blockCode(b: PlanBlock, rows: string, plan: Plan, d: Dialect): string {
  const outputs = b.outputs?.length ? b.outputs : ["outcome", "reason"];
  const fromAgent = plan.links
    .filter((l) => l.to === b.id)
    .map((l) => plan.blocks.find((x) => x.id === l.from)!)
    .find((x) => x.kind === "ai_agent");
  switch (b.kind) {
    case "sheets_read":
      return [
        `# Look up: ${(b.fields ?? []).join(", ") || "the columns you need"}`,
        `lookup = spark.read.table(need(T(${py("REPLACE_lookup_table")})))`,
        `items = items.join(lookup, on=need(${py("REPLACE_join_column")}), how="left")`,
      ].join("\n");
    case "http_request":
      return [
        `# ${b.system || "Your system"}: ${b.message || b.note || b.label}`,
        `import requests`,
        `API_URL = need(${py(`REPLACE: ${b.system || "system"} API address`)})`,
        `TOKEN = ${d.secret(`${snake(b.system || "system")}_token`)}`,
        `def fetch(row):`,
        `    r = requests.get(API_URL, headers={"Authorization": f"Bearer {TOKEN}"}, params={"id": row["case_id"]}, timeout=30)`,
        `    r.raise_for_status()`,
        `    return r.text`,
        `# REPLACE: call fetch() for the cases that need it and add what you need as columns.`,
      ].join("\n");
    case "set_fields":
      return [`from pyspark.sql import functions as F`, ...(b.fields?.length ? b.fields : ["summary"]).map((f) => `items = items.withColumn(${py(snake(f))}, F.lit(None).cast("string"))  # REPLACE: how to work out ${f}`)].join("\n");
    case "ai_agent":
      return d.ai(b, rows, outputs.map(snake));
    case "if":
      return [
        `# Rule: ${b.condition || b.label}`,
        `# Write it as a SQL condition on the case's columns${fromAgent ? `, e.g. ${snake(fromAgent.id)}_${snake(fromAgent.outputs?.[0] ?? "outcome")} = 'yes'` : ""}.`,
        `RULE_${b.id.toUpperCase()} = need(${py(`REPLACE: ${b.condition || "the rule"}`)})`,
        rows === "true" ? `items = items.withColumn("route_${b.id}", F.expr(RULE_${b.id.toUpperCase()}))` : `items = items.withColumn("route_${b.id}", F.expr(f"({RULE_${b.id.toUpperCase()}}) AND (${rows})"))`,
      ].join("\n");
    case "switch":
      return [
        `# Route each case to one of: ${(b.cases ?? []).join(", ")}`,
        `ROUTE_${b.id.toUpperCase()} = need(${py(fromAgent ? `${snake(fromAgent.id)}_${snake(fromAgent.outputs?.[0] ?? "outcome")}` : "REPLACE: a SQL expression that gives the case")})`,
        `items = items.withColumn("route_${b.id}", F.expr(ROUTE_${b.id.toUpperCase()}))`,
      ].join("\n");
    case "approval":
      return [
        `# Human in control: ${b.note || b.message || "a person decides."}`,
        `# These cases wait in the review table. A person sets decision to 'approved' or 'declined'`,
        `# (in a dashboard, an app or a Power Automate approval); the apply-decisions notebook does the rest.`,
        `review = (items.filter(${py(rows)})`,
        `    .withColumn("approval_step", F.lit(${py(b.id)}))`,
        `    .withColumn("decision", F.lit(None).cast("string"))`,
        `    .withColumn("decided_by", F.lit(None).cast("string"))`,
        `    .withColumn("applied_at", F.lit(None).cast("timestamp"))`,
        `    .withColumn("queued_at", F.current_timestamp()))`,
        `review.write.mode("append").option("mergeSchema", "true").saveAsTable(T("review"))`,
        `send("${b.channel ?? "email"}", ${py(b.to || "the reviewer")}, ${py(b.message || `Cases are waiting for your decision: ${plan.name}`)}, review)`,
      ].join("\n");
    case "sheets_append":
      return [`# Record: ${(b.fields ?? []).join(", ") || "the outcome"}`, `items.filter(${py(rows)}).withColumn("recorded_at", F.current_timestamp()).write.mode("append").option("mergeSchema", "true").saveAsTable(T("log"))`].join("\n");
    default: {
      const kind = OUTBOX_KINDS[b.kind];
      if (kind) return `send(${py(kind)}, ${py(b.to || "the recipient")}, ${py(b.message || b.note || b.label)}, items.filter(${py(rows)}))`;
      return `# ${b.label}`;
    }
  }
}

const SHARED_HELPERS = (prefix: string) =>
  [
    `from pyspark.sql import functions as F`,
    ``,
    `def need(value):`,
    `    """Stops the run until a placeholder has been replaced."""`,
    `    if "REPLACE" in str(value):`,
    `        raise ValueError(f"Fill this in first: {value}")`,
    `    return value`,
    ``,
    `def send(channel, to, message, rows):`,
    `    """Puts messages in the outbox table. Nothing is sent to anyone until you`,
    `    connect a sender (email, Teams, Slack or WhatsApp) that reads the outbox."""`,
    `    (rows.withColumn("channel", F.lit(channel)).withColumn("send_to", F.lit(to))`,
    `        .withColumn("message", F.lit(message)).withColumn("created_at", F.current_timestamp())`,
    `        .write.mode("append").option("mergeSchema", "true").saveAsTable(T("outbox")))`,
    ``,
    `PREFIX = ${py(prefix)}`,
  ].join("\n");

function triggerText(b: PlanBlock, d: Dialect): string {
  if (b.kind === "schedule_trigger") return `It runs on a schedule (${b.schedule || "set it on the job"}). The schedule is set on the ${d.name === "Databricks" ? "job in databricks.yml" : "pipeline"}.`;
  if (b.kind === "webhook") return `It starts when ${b.system || "another system"} sends a new case. Have that system write to the inbox table, or start a run through the ${d.name} API.`;
  return `It starts when someone fills in the form${b.fields?.length ? ` (${b.fields.join(", ")})` : ""}. Point your form or app at the inbox table.`;
}

export type DataJob = { prefix: string; prepare: Cell[]; apply: Cell[] | null; hasApproval: boolean };

export function dataJob(plan: Plan, d: Dialect): DataJob {
  const prefix = snake(plan.name);
  const conds = routing(plan);
  const ordered = orderBlocks(plan);
  const trigger = ordered.find((b) => TRIGGER_KINDS.includes(b.kind))!;
  const hasApproval = plan.blocks.some((b) => b.kind === "approval");
  const header = (title: string): Cell[] => [
    { kind: "md", text: `# ${plan.name}: ${title}\n\nMade with Builda from your team's design. **A starting point, not a finished build.**\n\n${plan.summary}\n\nEvery value that starts with REPLACE stops the run until you fill it in. Messages go to the outbox table until you connect a sender. Test with made-up data first.` },
    { kind: "code", text: `${d.setup()}\n\n${SHARED_HELPERS(prefix)}` },
  ];

  const prepare: Cell[] = [
    ...header("prepare and decide"),
    { kind: "md", text: `## 1. ${trigger.label}\n\n${triggerText(trigger, d)}` },
    { kind: "code", text: `items = spark.read.table(need(T(${py("REPLACE_inbox")})))  # REPLACE: where new cases land\nitems = items.withColumn("run_at", F.current_timestamp())` },
  ];
  const apply: Cell[] = [
    ...header("apply the decisions"),
    { kind: "md", text: `## Decided cases\n\nPicks up cases a person has approved or declined in the review table and hasn't been applied yet.` },
    { kind: "code", text: `items = spark.read.table(T("review")).filter("decision IN ('approved', 'declined') AND (applied_at IS NULL)")` },
  ];
  // Steps are numbered within each notebook.
  let prepN = 1;
  let applyN = 0;
  for (const b of ordered) {
    if (b === trigger) continue;
    const c = conds.get(b.id)!;
    const title = (n: number) => ({ kind: "md" as const, text: `## ${n}. ${b.label}${b.kind === "approval" ? " (a person decides)" : ""}\n\n${[b.note, b.condition && `Rule: ${b.condition}`].filter(Boolean).join("\n\n") || ""}`.trim() });
    if (c.prep) prepare.push(title(++prepN), { kind: "code", text: blockCode(b, c.prep, plan, d) });
    if (c.apply && hasApproval) apply.push(title(++applyN), { kind: "code", text: blockCode(b, c.apply, plan, d) });
  }
  prepare.push({ kind: "md", text: `## Keep a record\n\nEvery run is kept in the runs table, so you can see what happened to each case.` }, { kind: "code", text: `items.write.mode("append").option("mergeSchema", "true").saveAsTable(T("runs"))` });
  apply.push(
    { kind: "md", text: `## Mark them done\n\nSo each decision is only applied once.` },
    {
      kind: "code",
      text: [
        `from delta.tables import DeltaTable`,
        `done = items.select("case_id", "approval_step").withColumn("applied_now", F.current_timestamp())`,
        `(DeltaTable.forName(spark, T("review")).alias("r")`,
        `    .merge(done.alias("d"), "r.case_id = d.case_id AND r.approval_step = d.approval_step")`,
        `    .whenMatchedUpdate(set={"applied_at": "d.applied_now"}).execute())`,
      ].join("\n"),
    },
  );
  return { prefix, prepare, apply: hasApproval ? apply : null, hasApproval };
}

// The setup and data notes every data export ships with.
export function dataReadme(plan: Plan, platform: string, steps: string[]): string {
  return [
    `# ${plan.name}: ${platform} starter`,
    ``,
    `Made with Builda from your team's design. This is a starting point, not a finished build.`,
    ``,
    plan.summary,
    ``,
    `## Set it up`,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `## The tables it uses`,
    `- **inbox**: new cases. Each needs a unique \`case_id\` column.`,
    `- **review**: cases waiting for a person. They set \`decision\` to approved or declined, and \`decided_by\` to their name.`,
    `- **outbox**: messages to send. Nothing is sent until you connect a sender that reads this table.`,
    `- **runs** and **log**: what happened to every case.`,
    ``,
    `## Keep a person in control`,
    `The review table is where people decide. Don't let the second notebook act on a case without a decision in it.`,
    ``,
    `Every value that starts with REPLACE stops the run until you fill it in. Test with made-up data before real cases.`,
  ].join("\n");
}

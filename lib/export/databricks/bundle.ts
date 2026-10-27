import { dataJob, dataReadme, type Cell, type Dialect } from "../data-job";
import { TRIGGER_KINDS, validatePlan, type Plan } from "../plan";
import { quartzFrom } from "../schedule";
import { zip } from "../zip";

// The Databricks export: a Databricks Asset Bundle with
// the jobs in databricks.yml and the notebooks in src/. Deploy with
// `databricks bundle deploy`, or open it from a Git folder in the workspace.
// Jobs have no cluster settings, so they run on serverless compute (the only
// option on Databricks Free Edition). Every schedule ships paused.

const py = (s: string) => JSON.stringify(s);

export const databricksDialect: Dialect = {
  name: "Databricks",
  setup: () =>
    [
      `dbutils.widgets.text("catalog", "main")`,
      `dbutils.widgets.text("schema", "builda")`,
      `dbutils.widgets.text("model_endpoint", "REPLACE: a model serving endpoint from the Serving page")`,
      `CATALOG = dbutils.widgets.get("catalog")`,
      `SCHEMA = dbutils.widgets.get("schema")`,
      `spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")`,
      ``,
      `def T(name):`,
      `    return f"{CATALOG}.{SCHEMA}.{PREFIX}_{name}"`,
    ].join("\n"),
  ai: (b, rows, outputs) =>
    [
      `# AI step: ${b.message || b.note || b.label}`,
      `MODEL = need(dbutils.widgets.get("model_endpoint"))`,
      `PROMPT_${b.id.toUpperCase()} = ${py(`${b.message || b.note || b.label} Reply with only a JSON object with the keys: ${outputs.join(", ")}. If you are unsure, say so in the reason and leave the decision to a person.`)}`,
      `sql = "ai_query('" + MODEL + "', concat('" + PROMPT_${b.id.toUpperCase()}.replace("'", "''") + "', ' Case: ', to_json(struct(*))))"`,
      `items = items.withColumn("ai_raw_${b.id}", F.when(F.expr(${py(rows)}), F.expr(sql)))`,
      `items = items.withColumn("ai_${b.id}", F.from_json("ai_raw_${b.id}", ${py(outputs.map((o) => `${o} STRING`).join(", "))}))`,
      ...outputs.map((o) => `items = items.withColumn("${b.id}_${o}", F.col("ai_${b.id}.${o}"))`),
    ].join("\n"),
  secret: (key) => `dbutils.secrets.get(scope="builda", key=${py(key)})`,
};

// Databricks "source" notebook format: cells split by COMMAND lines,
// markdown as MAGIC %md.
export function databricksNotebook(cells: Cell[]): string {
  const body = cells.map((c) => (c.kind === "md" ? ["# MAGIC %md", ...c.text.split("\n").map((l) => `# MAGIC ${l}`.trimEnd())].join("\n") : c.text));
  return `# Databricks notebook source\n${body.join("\n\n# COMMAND ----------\n\n")}\n`;
}

const yamlStr = (s: string) => JSON.stringify(s);

export function databricksBundle(plan: Plan): Buffer {
  const problems = validatePlan(plan, { requireApproval: false });
  if (problems.length) throw new Error(`Cannot compile an invalid plan: ${problems.join(" ")}`);
  const job = dataJob(plan, databricksDialect);
  const trigger = plan.blocks.find((b) => TRIGGER_KINDS.includes(b.kind))!;
  // Scheduled designs keep their timetable; others check the inbox every 15 minutes.
  const prepCron = trigger.kind === "schedule_trigger" ? quartzFrom(trigger.schedule || trigger.note) : "0 0/15 * * * ?";
  const params = ["catalog: ${var.catalog}", "schema: ${var.schema}", "model_endpoint: ${var.model_endpoint}"];
  const jobYaml = (key: string, name: string, cron: string, path: string) => [
    `    ${key}:`,
    `      name: ${yamlStr(name)}`,
    `      schedule:`,
    `        quartz_cron_expression: ${yamlStr(cron)}`,
    `        timezone_id: Europe/London`,
    `        pause_status: PAUSED`,
    `      tasks:`,
    `        - task_key: run`,
    `          notebook_task:`,
    `            notebook_path: ${path}`,
    `            base_parameters:`,
    ...params.map((p) => `              ${p}`),
  ];
  const yml = [
    `# ${plan.name}: made with Builda. A starting point, not a finished build.`,
    `# Deploy: databricks bundle deploy. Schedules start paused; unpause them when you've tested.`,
    `bundle:`,
    `  name: ${job.prefix}`,
    ``,
    `variables:`,
    `  catalog:`,
    `    default: main`,
    `  schema:`,
    `    default: builda`,
    `  model_endpoint:`,
    `    description: A model serving endpoint for the AI steps (see the Serving page).`,
    `    default: "REPLACE: a model serving endpoint"`,
    ``,
    `resources:`,
    `  jobs:`,
    ...jobYaml(`${job.prefix}_prepare`, `${plan.name}: prepare and decide`, prepCron, "./src/01_prepare_and_decide.py"),
    ...(job.apply ? jobYaml(`${job.prefix}_apply`, `${plan.name}: apply decisions`, "0 0/30 * * * ?", "./src/02_apply_decisions.py") : []),
    ``,
    `targets:`,
    `  dev:`,
    `    mode: development`,
    `    default: true`,
  ].join("\n");

  const readme = dataReadme(plan, "Databricks", [
    "Install the Databricks CLI and log in (`databricks auth login`). Databricks Free Edition works.",
    "Fill in the catalog, schema and model endpoint in databricks.yml (or pass them with --var).",
    "Run `databricks bundle deploy` from this folder. The jobs appear under Jobs & Pipelines, paused.",
    "Create the inbox table with a `case_id` column and a few made-up cases.",
    "Open each notebook, replace every REPLACE value and run it by hand until it works.",
    "Add secrets for any system it calls: `databricks secrets create-scope builda`.",
    "Unpause the schedules when you're happy.",
  ]);
  return zip([
    { path: "databricks.yml", data: `${yml}\n` },
    { path: "src/01_prepare_and_decide.py", data: databricksNotebook(job.prepare) },
    ...(job.apply ? [{ path: "src/02_apply_decisions.py", data: databricksNotebook(job.apply) }] : []),
    { path: "README.md", data: readme },
  ]);
}

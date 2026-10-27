import { dataJob, dataReadme, type Cell, type Dialect } from "../data-job";
import { validatePlan, type Plan } from "../plan";
import { zip } from "../zip";

// The Microsoft Fabric export: the notebooks as .ipynb (Workspace → Import →
// Notebook) and a data pipeline definition per notebook, to paste into the
// pipeline's JSON view. Notebooks read and write tables in the lakehouse
// attached to them.

const py = (s: string) => JSON.stringify(s);
const ZERO = "00000000-0000-0000-0000-000000000000";

export const fabricDialect: Dialect = {
  name: "Fabric",
  setup: () =>
    [
      `# Attach a lakehouse to this notebook first (Explorer → Add data items → Lakehouse).`,
      `def T(name):`,
      `    return f"{PREFIX}_{name}"`,
    ].join("\n"),
  ai: (b, rows, outputs) =>
    [
      `# AI step: ${b.message || b.note || b.label}`,
      `# Uses Fabric AI functions (see "AI functions" in the Fabric docs; needs an F2 or larger capacity).`,
      `# Check the import and call against the docs for your runtime, then remove the need() line.`,
      `need("REPLACE: confirm Fabric AI functions are enabled for your capacity")`,
      `from synapse.ml.spark.aifunc.DataFrameExtensions import AIFunctions  # noqa: F401 (adds df.ai)`,
      `PROMPT_${b.id.toUpperCase()} = ${py(`${b.message || b.note || b.label} Reply with only a JSON object with the keys: ${outputs.join(", ")}. If you are unsure, say so in the reason and leave the decision to a person.`)}`,
      `todo = items.filter(${py(rows)}).withColumn("case_json", F.to_json(F.struct("*")))`,
      `todo = todo.ai.generate_response(prompt=PROMPT_${b.id.toUpperCase()} + " Case: {case_json}", is_prompt_template=True, output_col="ai_raw_${b.id}")`,
      `todo = todo.withColumn("ai_${b.id}", F.from_json("ai_raw_${b.id}", ${py(outputs.map((o) => `${o} STRING`).join(", "))}))`,
      ...outputs.map((o) => `todo = todo.withColumn("${b.id}_${o}", F.col("ai_${b.id}.${o}"))`),
      `items = items.join(todo.select("case_id", ${outputs.map((o) => py(`${b.id}_${o}`)).join(", ")}), on="case_id", how="left")`,
    ].join("\n"),
  secret: (key) => `notebookutils.credentials.getSecret(need("REPLACE: your Azure Key Vault URL"), ${py(key)})`,
};

export function ipynb(cells: Cell[]): string {
  const lines = (t: string) => t.split("\n").map((l, i, a) => (i < a.length - 1 ? `${l}\n` : l));
  return JSON.stringify(
    {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: { kernel_info: { name: "synapse_pyspark" }, kernelspec: { name: "synapse_pyspark", display_name: "Synapse PySpark" }, language_info: { name: "python" } },
      cells: cells.map((c) => (c.kind === "md" ? { cell_type: "markdown", metadata: {}, source: lines(c.text) } : { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: lines(c.text) })),
    },
    null,
    1,
  );
}

export function fabricPipeline(name: string, notebook: string) {
  return {
    properties: {
      description: `Runs the ${notebook} notebook. Made with Builda.`,
      activities: [
        {
          name: notebook.slice(0, 55),
          type: "TridentNotebook",
          dependsOn: [],
          policy: { timeout: "0.02:00:00", retry: 1, retryIntervalInSeconds: 60, secureOutput: false, secureInput: false },
          // Pick the imported notebook in the activity's settings; these ids are placeholders.
          typeProperties: { notebookId: ZERO, workspaceId: ZERO },
        },
      ],
      annotations: [`Builda: ${name}`],
    },
  };
}

export function fabricPackage(plan: Plan): Buffer {
  const problems = validatePlan(plan, { requireApproval: false });
  if (problems.length) throw new Error(`Cannot compile an invalid plan: ${problems.join(" ")}`);
  const job = dataJob(plan, fabricDialect);
  const prepName = `${job.prefix}_prepare_and_decide`;
  const applyName = `${job.prefix}_apply_decisions`;
  const readme = dataReadme(plan, "Microsoft Fabric", [
    "Create a lakehouse in your workspace (a Fabric trial works).",
    `Import the notebooks: Workspace → Import → Notebook → From this computer, and pick the .ipynb files in notebooks/.`,
    "Open each notebook and attach the lakehouse (Explorer → Add data items).",
    "Create the inbox table with a `case_id` column and a few made-up cases.",
    "Replace every REPLACE value and run each notebook by hand until it works.",
    `Create a data pipeline, open its JSON view ({} in the Home tab) and paste the matching file from pipelines/. Then pick the imported notebook in the Notebook activity.`,
    job.apply ? "Schedule the prepare pipeline to match your design, and the apply pipeline every 30 minutes." : "Schedule the pipeline to match your design.",
    "Messages wait in the outbox table. To send them, add an Outlook or Teams activity after the notebook, or a Power Automate flow that reads the outbox.",
  ]);
  return zip([
    { path: `notebooks/${prepName}.ipynb`, data: ipynb(job.prepare) },
    ...(job.apply ? [{ path: `notebooks/${applyName}.ipynb`, data: ipynb(job.apply) }] : []),
    { path: `pipelines/${prepName}.json`, data: JSON.stringify(fabricPipeline(plan.name, prepName), null, 2) },
    ...(job.apply ? [{ path: `pipelines/${applyName}.json`, data: JSON.stringify(fabricPipeline(plan.name, applyName), null, 2) }] : []),
    { path: "README.md", data: readme },
  ]);
}

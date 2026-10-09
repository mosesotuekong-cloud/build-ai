import { OPPORTUNITY_MAP_SYSTEM } from "@/lib/ai/prompts/opportunity-map";
import { reportProseSchema, type ReportProse } from "@/lib/ai/schemas/report";
import type { AIProvider } from "@/lib/ai/types";
import { bucketTitle, BUCKETS, type OpportunityMap } from "./map";

// What the AI sees: the map without team names, owners or any player data.
export function anonymisedBrief(map: OpportunityMap): string {
  const t = map.totals;
  const lines = [
    `SESSION: ${map.session.name}. ${t.teams} teams, ${t.players} people. Platforms in the company's stack: ${map.session.platformNames.join(", ") || "none listed"}.`,
    `TOTALS: ${t.useCases} use cases designed, about ${t.hoursPerMonth} hours a month saved in total. Quick wins ${t.quick_win}, strategic bets ${t.strategic_bet}, fix the data first ${t.fix_data}, park ${t.park}. ${t.raised} more problems raised but not designed. ${t.commitments} commitments made.`,
    "",
    "USE CASES (ranked):",
  ];
  for (const u of map.useCases) {
    lines.push(
      `${u.ref}: ${u.designName} (${u.functionName}${u.source === "raised" ? ", raised by staff" : ""}). Bucket: ${bucketTitle(u.bucket)}.`,
      `  Design: trigger: ${u.slots.trigger || "-"} | steps: ${u.slots.steps || "-"} | decision: ${u.slots.decision || "-"} | action: ${u.slots.action || "-"} | human: ${u.slots.human || "-"}`,
      `  Hours a month: ${u.hoursPerMonth ?? "not estimated"}. Kind of AI: ${u.aiKindLabel ?? "unclear"}. Risk: ${u.risk}${u.riskReasons.length ? ` (${u.riskReasons.join(", ")})` : ""}. Best-fit platform: ${u.platformFit?.name ?? "none"}.`,
      `  Before building: ${u.itReasons.join("; ") || "nothing flagged"}.`,
      u.ai ? `  AI assessment note: ${u.ai.note}` : "",
      u.disagreements.length ? `  Disagreements: ${u.disagreements.join(" ")}` : "",
    );
  }
  if (map.raised.length) {
    lines.push("", "RAISED PROBLEMS (not yet designed):");
    for (const r of map.raised) lines.push(`- ${r.title}: ${r.what_happens}${r.frequency ? ` (${r.frequency})` : ""}`);
  }
  if (map.commitments.length) {
    lines.push("", "COMMITMENTS:");
    for (const c of map.commitments) lines.push(`- ${c.ref}: first step "${c.first_step}", due ${new Date(c.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`);
  }
  if (map.beforeAfter) {
    const b = map.beforeAfter;
    lines.push(
      "",
      `BEFORE AND AFTER: ${b.players} people did both solo rounds. Average ${b.before} before, ${b.after} after (${b.change >= 0 ? "+" : ""}${b.change}). ${b.improved} improved.`,
      ...b.criteria.map((c) => `- ${c.label}: ${c.before}% → ${c.after}%`),
    );
  }
  if (map.learning.length) {
    lines.push("", "WHERE TEAMS STRUGGLED:", ...map.learning.map((f) => `- ${f.text}`));
  }
  return lines.filter((l) => l !== "").join("\n");
}

// Keeps only notes and recommendations for refs that exist.
function clean(prose: ReportProse, map: OpportunityMap): ReportProse {
  const refs = new Set(map.useCases.map((u) => u.ref));
  return {
    ...prose,
    recommendations: prose.recommendations.filter((r) => refs.has(r.ref)),
    use_case_notes: prose.use_case_notes.filter((n) => refs.has(n.ref)),
  };
}

export async function writeReportProse(provider: AIProvider, map: OpportunityMap): Promise<{ prose: ReportProse; source: "ai" | "template" }> {
  if (!map.useCases.length) return { prose: templateProse(map), source: "template" };
  try {
    const prose = await provider.generateObject({
      task: "opportunity-map",
      model: "opportunityMap",
      system: OPPORTUNITY_MAP_SYSTEM,
      messages: [{ role: "user", content: `${anonymisedBrief(map)}\n\nWrite the report.` }],
      schema: reportProseSchema,
      maxTokens: 6000,
    });
    const cleaned = clean(prose, map);
    if (!cleaned.recommendations.length) throw new Error("No recommendation matched a use case.");
    return { prose: cleaned, source: "ai" };
  } catch (error) {
    console.error("Report writing fell back to templates:", error instanceof Error ? error.message : error);
    return { prose: templateProse(map), source: "template" };
  }
}

// Plain, honest prose from the numbers alone, used when the AI is unavailable.
export function templateProse(map: OpportunityMap): ReportProse {
  const t = map.totals;
  const quick = map.useCases.filter((u) => u.bucket === "quick_win");
  const top = (quick.length ? quick : map.useCases).slice(0, 3);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const summary = [
    `${plural(t.teams, "team")} designed ${plural(t.useCases, "automation")} in this session, worth about ${t.hoursPerMonth} hours a month between them if built as designed.${t.raised ? ` Staff also raised ${plural(t.raised, "more problem")} to look at next.` : ""}`,
    `Quick wins (valuable, low effort, data ready): ${t.quick_win}. Strategic bets: ${t.strategic_bet}. Fix the data first: ${t.fix_data}. Park for now: ${t.park}.`,
  ];
  if (map.beforeAfter) {
    const b = map.beforeAfter;
    summary.push(`In the solo rounds, ${plural(b.players, "person", "people")} went from an average of ${b.before} to ${b.after} out of 100 (${b.change >= 0 ? "+" : ""}${b.change}), and ${b.improved} improved.`);
  }
  const highRisk = map.useCases.filter((u) => u.risk === "high").length;
  if (highRisk) summary.push(`${plural(highRisk, "use case")} ${highRisk === 1 ? "carries" : "carry"} high risk, so a person must stay in control and the right sign-off should come before anything goes live.`);

  return {
    headline: t.useCases
      ? `${plural(t.useCases, "automation")} found, ${t.quick_win} ready to start now.`
      : "No automations were designed in this session yet.",
    summary: summary.length >= 2 ? summary : [...summary, "Run another session to build the backlog."],
    recommendations: top.length
      ? top.map((u) => ({ ref: u.ref, text: `${u.designName}: ${BUCKETS.find((b) => b.key === u.bucket)?.blurb ?? "Rate it to see where it fits."}${u.itReasons.length ? ` First: ${u.itReasons[0].toLowerCase()}.` : ""}` }))
      : [{ ref: "", text: "Design at least one use case to get recommendations." }],
    use_case_notes: map.useCases.map((u) => ({
      ref: u.ref,
      note: [
        `${bucketTitle(u.bucket)}${u.hoursPerMonth ? `, about ${u.hoursPerMonth} hours a month` : ""}.`,
        u.itReasons.length ? `Before building: ${u.itReasons.join("; ").toLowerCase()}.` : "Nothing blocks a first build.",
        u.disagreements[0] ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 400),
    })),
    learning: map.learning.length ? map.learning.map((f) => f.text).join(" ") : "",
    next_steps: [
      quick.length ? `Build ${quick[0].designName} (${quick[0].ref}) first, with the team that designed it.` : "Pick the highest-ranked use case and agree an owner.",
      "Confirm data access and sign-off for each use case marked as needing IT.",
      map.commitments.length ? "Check in with each owner on their commitment's due date." : "Name an owner and a first step for each use case you keep.",
    ],
  };
}

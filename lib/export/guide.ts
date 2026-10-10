import { CANVAS_SLOTS, oversightLabel, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { CoachDesign } from "@/lib/coach/context";
import type { Platform } from "@/lib/config/platforms";
import { orderBlocks, type Plan } from "./plan";

// A deterministic build guide: maps the team's five slots, and the blocks of
// its plan, onto one platform's own concepts. Markdown, so it opens anywhere.
export function buildGuideMarkdown(input: { design: CoachDesign; plan: Plan | null; platform: Platform }): string {
  const { design, plan, platform } = input;
  const title = plan?.name || design.name || "Our automation";
  const lines: string[] = [
    `# ${title}: build guide for ${platform.name}`,
    "",
    `Made with Builda from your team's design. This is a guide, not a finished build. Check product names and features with your ${platform.name} team before you start.`,
    "",
    `**${platform.name}** (${platform.vendor}) is good for: ${platform.goodFor}`,
  ];
  if (plan?.summary) lines.push("", "## What it does", "", plan.summary);
  if (design.hours_saved_per_month) lines.push("", `Your team estimated it saves about **${design.hours_saved_per_month} hours a month**.`);

  lines.push("", "## Slot by slot");
  for (const slot of CANVAS_SLOTS) {
    const blocks = plan ? orderBlocks(plan).filter((b) => b.slot === slot) : [];
    lines.push(
      "",
      `### ${SLOT_LABELS[slot].title}${slot === "human" ? " (keep this)" : ""}`,
      "",
      `- **Your design:** ${slot === "human" && oversightLabel(design.oversight) ? `${oversightLabel(design.oversight)}. ` : ""}${design[slot].trim() || (slot === "human" && design.oversight ? "" : "You left this empty. Decide it before you build.")}`,
      `- **On ${platform.name}:** ${platform.slots[slot]}`,
    );
    for (const b of blocks) {
      const details = [b.note, b.condition && `Rule: ${b.condition}`, b.cases && `Outcomes: ${b.cases.join(", ")}`, b.system && `System: ${b.system}`, b.to && `Goes to: ${b.to}`]
        .filter(Boolean)
        .join(" · ");
      lines.push(`- Build step: **${b.label}**${details ? `. ${details}` : ""}`);
    }
  }

  const systems = [...new Set([...design.tools, ...design.systems])];
  lines.push("", "## Before you build", "");
  if (systems.length) lines.push(`1. Get access to: ${systems.join(", ")}.`);
  else lines.push("1. List the systems this touches and get access to each.");
  lines.push(
    "2. Agree who the person in control is, and what they see when they decide.",
    "3. Build it with made-up data first, and test the cases the rule can't settle.",
    "4. Tell the people affected what changes for them.",
  );
  return lines.join("\n") + "\n";
}

export function fileSlug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "automation"
  );
}

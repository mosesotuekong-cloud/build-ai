import { keywordCheck, type AiActCheck } from "./ai-act";
import { businessCase, defaultInputs, type BusinessCase, type BusinessInputs } from "./business";
import { coachDesign, regionOf, type Discovery } from "./model";
import { verdictFrom, verdictReasons, type Verdict } from "./verdict";

// Everything the results screen and the PDF say about a discovery's worth,
// worked out one way so the two always agree.

export function verdictOf(d: Discovery): { verdict: Verdict | null; reasons: string[] } {
  const input = { ...d.rank, oversight: coachDesign(d).oversight ?? null };
  return { verdict: verdictFrom(input), reasons: verdictReasons(input) };
}

// The business case inputs: what people set, else the AI's estimates from
// "Make it stronger", else starting values from the team's own guess.
export function businessInputsOf(d: Discovery): BusinessInputs {
  if (d.business) return d.business;
  const region = regionOf(d);
  const e = d.strengthened?.estimates;
  if (e) {
    return { ...e, hourly_rate: region.hourlyRate, build_day_rate: region.buildDayRate, source: "ai" };
  }
  return defaultInputs({ hoursSavedGuess: coachDesign(d).hours_saved_per_month, blocks: d.plan?.blocks.length ?? 6, region });
}

export function businessOf(d: Discovery): { inputs: BusinessInputs; result: BusinessCase } {
  const inputs = businessInputsOf(d);
  return { inputs, result: businessCase(inputs) };
}

// The text the keyword check reads: the challenge and the whole design.
export function discoveryText(d: Discovery): string {
  const design = coachDesign(d);
  return [d.challenge?.title, d.challenge?.story, design.name, design.trigger, design.steps, design.decision, design.action, design.human].filter(Boolean).join("\n");
}

// The AI's assessment after "Make it stronger", otherwise the keyword check.
export function aiActOf(d: Discovery): AiActCheck {
  const ai = d.strengthened?.ai_act;
  return ai ? { ...ai, source: "ai" } : keywordCheck(discoveryText(d));
}

// Stress test it: twist cards drawn on the results screen. Each changes the
// team's situation in a way real projects meet, and asks what they would
// change. A fixed bank, so no AI is needed and every twist is fair. (The
// roadmap of 25 October 2026 asks for these twists in Builda Play.)

export const TWISTS = [
  { key: "no_api", title: "No API access", text: "IT says the main system has no API you can use this quarter. Data only comes out as a daily export.", ask: "How does your workflow get the data now, and what does that change for timing?" },
  { key: "messy_data", title: "The data is messy", text: "A sample shows a third of the records are missing a field your decision depends on.", ask: "What happens to those cases, and who fixes the data?" },
  { key: "costly_error", title: "A costly mistake", text: "In testing, one wrong decision would have cost ten times your monthly saving.", ask: "Where do you add a check, and what does the checker see?" },
  { key: "budget_cut", title: "Budget halved", text: "The budget for building this has just been cut in half.", ask: "What do you build first, and what waits?" },
  { key: "approval", title: "Approval required", text: "Compliance says a named person must approve every decision for the first three months.", ask: "How does the workflow wait for approval without slowing everything down?" },
  { key: "volume", title: "Volume doubles", text: "A new contract means twice as many cases from next month.", ask: "What breaks first, and how does the workflow cope?" },
  { key: "owner_leaves", title: "The owner leaves", text: "The person who knows this process best is leaving in four weeks.", ask: "What do you capture now so the workflow still makes sense without them?" },
] as const;

export type TwistKey = (typeof TWISTS)[number]["key"];
export const TWIST_KEYS = TWISTS.map((t) => t.key) as [TwistKey, ...TwistKey[]];
export const getTwist = (key: string) => TWISTS.find((t) => t.key === key) ?? null;

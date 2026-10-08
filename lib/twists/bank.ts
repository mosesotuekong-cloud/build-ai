import type { Twist } from "@/lib/ai/schemas/check";

// Curated operational twists. Used when the AI is slow or fails, so a room
// never waits on a twist. Each works for almost any case.
export const TWIST_BANK: Twist[] = [
  { twist: "The person who would approve this is on leave for the next two weeks.", affects: ["human"] },
  { twist: "Half the staff involved don't have a work email address.", affects: ["trigger", "action"] },
  { twist: "Finance says there's no money for new software this quarter.", affects: ["steps", "action"] },
  { twist: "The spreadsheet you rely on is being replaced by a new system next month, and nobody knows its format yet.", affects: ["steps"] },
  { twist: "IT says WhatsApp can't be connected to company systems, for security reasons.", affects: ["trigger", "action"] },
  { twist: "A new branch opens next month, and the volume of requests will double.", affects: ["decision", "human"] },
  { twist: "The one person who really knows how this process works leaves the company in two weeks.", affects: ["steps", "decision"] },
  { twist: "Head office now wants every decision in this process logged for an audit.", affects: ["action", "human"] },
  { twist: "The office internet goes down two afternoons a week because of power cuts.", affects: ["trigger", "steps"] },
  { twist: "Management now wants every request answered within one hour, not one day.", affects: ["decision", "action"] },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// A stable twist for a team, so a retry gives the same one.
export function bankTwistFor(teamId: string): Twist {
  return TWIST_BANK[hash(teamId) % TWIST_BANK.length];
}

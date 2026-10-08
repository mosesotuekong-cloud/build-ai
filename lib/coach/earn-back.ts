// Rules for earning a hint coin back by acting on the coach. Enforced on the
// server; these helpers decide what counts.

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// Edit distance between two strings (Levenshtein), capped for speed.
function distance(a: string, b: string, cap = 50): number {
  if (Math.abs(a.length - b.length) >= cap) return cap;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin >= cap) return cap;
    previous = current;
  }
  return previous[b.length];
}

// A "real" change: not just spaces, case or a typo. At least 8 characters of
// difference, or a slot going from empty to a meaningful answer.
export const MIN_MEANINGFUL_CHANGE = 8;

export function isMeaningfulChange(before: string, after: string): boolean {
  const a = normalise(before);
  const b = normalise(after);
  if (a === b || b.length < 5) return false;
  if (!a) return b.length >= MIN_MEANINGFUL_CHANGE;
  return distance(a, b) >= MIN_MEANINGFUL_CHANGE;
}

export type EarnableMessage = { id: string; role: "team" | "coach"; slot: string | null; token_earned_at: string | null; created_at: string };

// The coach message a change to `slot` can pay out for: the most recent coach
// message about that slot that hasn't paid out yet.
export function pickEarnableMessage(messages: EarnableMessage[], slot: string): EarnableMessage | null {
  const candidates = messages.filter((m) => m.role === "coach" && m.slot === slot && !m.token_earned_at);
  if (!candidates.length) return null;
  return candidates.reduce((latest, m) => (m.created_at > latest.created_at ? m : latest));
}

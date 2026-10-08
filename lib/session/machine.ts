import type { SessionSettings } from "./settings";

// The session state machine. This is the only place that decides which
// phase can follow which. Transitions happen on the server only.
//
//   draft → lobby → baseline_check (optional) → solving → twist → solving_after_twist
//   → prioritise → judging → reveal → post_check (optional) → commitments → report → closed
//
// Optional phases depend on settings: without the before-and-after check,
// lobby goes straight to solving and reveal straight to commitments. Without
// the twist, solving goes straight to prioritise. Leaving a switched-off phase
// is still allowed, so changing settings mid-session never strands a room.
// Any phase can be ended early
// (→ closed), except a draft, which is simply deleted.
//
// Practice runs (one player, no facilitator) use a short path:
// solving → reveal when the player finishes, and reveal → solving to keep improving.

export const PHASES = [
  "draft",
  "lobby",
  "baseline_check",
  "solving",
  "twist",
  "solving_after_twist",
  "prioritise",
  "judging",
  "reveal",
  "post_check",
  "commitments",
  "report",
  "closed",
] as const;

export type Phase = (typeof PHASES)[number];
export type SessionMode = "live" | "practice";

type MachineSettings = Pick<SessionSettings, "before_after_check" | "twist_enabled">;

export function nextPhase(phase: Phase, settings: MachineSettings): Phase | null {
  switch (phase) {
    case "draft":
      return "lobby";
    case "lobby":
      return settings.before_after_check ? "baseline_check" : "solving";
    case "baseline_check":
      return "solving";
    case "solving":
      return settings.twist_enabled ? "twist" : "prioritise";
    case "twist":
      return "solving_after_twist";
    case "solving_after_twist":
      return "prioritise";
    case "prioritise":
      return "judging";
    case "judging":
      return "reveal";
    case "reveal":
      return settings.before_after_check ? "post_check" : "commitments";
    case "post_check":
      return "commitments";
    case "commitments":
      return "report";
    case "report":
      return "closed";
    case "closed":
      return null;
  }
}

export function canTransition(from: Phase, to: Phase, settings: MachineSettings, mode: SessionMode = "live"): boolean {
  if (mode === "practice") {
    return (from === "solving" && to === "reveal") || (from === "reveal" && to === "solving") || (to === "closed" && from !== "closed");
  }
  if (to === "closed") return from !== "closed" && from !== "draft";
  return nextPhase(from, settings) === to;
}

// Phases where teams can edit their design and talk to the coach.
export const DESIGN_PHASES: ReadonlySet<Phase> = new Set(["solving", "solving_after_twist"]);
export const COACH_PHASES: ReadonlySet<Phase> = new Set(["solving", "twist", "solving_after_twist"]);

// Timed phases and their duration in seconds, or null to run until advanced.
export function phaseDurationSeconds(phase: Phase, settings: SessionSettings): number | null {
  const minutes = settings.minutes[phase as keyof SessionSettings["minutes"]];
  return minutes ? Math.round(minutes * 60) : null;
}

export const PHASE_LABELS: Record<Phase, { title: string; player: string }> = {
  draft: { title: "Draft", player: "This session hasn't opened yet." },
  lobby: { title: "Lobby", player: "You're in. Pick your case while everyone joins." },
  baseline_check: { title: "Warm-up round", player: "A quick solo round to warm up." },
  solving: { title: "Design", player: "Design your automation. The coach is here to help." },
  twist: { title: "Twist", player: "Something just changed for your team." },
  solving_after_twist: { title: "Adapt", player: "Adapt your design to the twist." },
  prioritise: { title: "Prioritise", player: "Place your design on the impact and effort grid." },
  judging: { title: "Judging", player: "Designs are being judged. Hold tight." },
  reveal: { title: "Reveal", player: "Here's how it went." },
  post_check: { title: "Final round", player: "One more quick solo round." },
  commitments: { title: "Commitments", player: "Name an owner and a first step." },
  report: { title: "Report", player: "Thanks for playing. Your facilitator has the report." },
  closed: { title: "Closed", player: "This session has ended. Thanks for playing." },
};

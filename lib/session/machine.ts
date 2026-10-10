import type { SessionSettings } from "./settings";

// The session state machine. This is the only place that decides which
// phase can follow which. Transitions happen on the server only.
//
// The four-step method: Fix → Design → Control (part of Design) → Rank.
//
//   draft → lobby → baseline_check (optional) → fix → solving → twist (optional)
//   → prioritise ("Rank") → reveal → post_check (optional) → commitments → report → closed
//
// Teams adapt their design during the twist itself. Judging runs in the
// background while teams rank, so there is no judging phase to wait through.
// Optional phases depend on settings: without the before-and-after check,
// lobby goes straight to fix and reveal straight to commitments. Without the
// twist, solving goes straight to prioritise. Leaving a switched-off phase is
// still allowed, so changing settings mid-session never strands a room.
// "solving_after_twist" and "judging" belong to the older, longer flow; a
// session left in one of them can still move on.
// Any phase can be ended early
// (→ closed), except a draft, which is simply deleted.
//
// Practice runs (one player, no facilitator) use a short path:
// solving → reveal when the player finishes, and reveal → solving to keep improving.

export const PHASES = [
  "draft",
  "lobby",
  "baseline_check",
  "fix",
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
      return settings.before_after_check ? "baseline_check" : "fix";
    case "baseline_check":
      return "fix";
    case "fix":
      return "solving";
    case "solving":
      return settings.twist_enabled ? "twist" : "prioritise";
    case "twist":
      return "prioritise";
    case "solving_after_twist":
      return "prioritise";
    case "prioritise":
      return "reveal";
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
export const DESIGN_PHASES: ReadonlySet<Phase> = new Set(["solving", "twist", "solving_after_twist"]);
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
  fix: { title: "Fix it first", player: "Before you automate: what would you stop, merge or simplify?" },
  solving: { title: "Design", player: "Design your automation, and decide how much a person stays in control." },
  twist: { title: "Twist", player: "Something just changed. Adapt your design." },
  solving_after_twist: { title: "Adapt", player: "Adapt your design to the twist." },
  prioritise: { title: "Rank", player: "Is it worth it, is it ready, how risky is it? Three taps." },
  judging: { title: "Judging", player: "Designs are being judged. Hold tight." },
  reveal: { title: "Reveal", player: "Here's how it went." },
  post_check: { title: "Final round", player: "One more quick solo round." },
  commitments: { title: "Commitments", player: "Name an owner and a first step." },
  report: { title: "Report", player: "Thanks for playing. Your facilitator has the report." },
  closed: { title: "Closed", player: "This session has ended. Thanks for playing." },
};

// Autosaves can arrive a moment after the canvas locks (someone typed just
// before the facilitator moved on). Saves within this grace period still land,
// so nobody loses their last edit.
export const DESIGN_SAVE_GRACE_SECONDS = 15;

// Which design version(s) a save should write, or none if the canvas is locked.
// "current" means the team's latest version.
export function designSaveTargets(
  phase: Phase,
  phaseStartedAt: string | null,
  now: number = Date.now(),
): ("before_twist" | "after_twist" | "current")[] {
  if (phase === "solving") return ["before_twist"];
  if (phase === "solving_after_twist") return ["after_twist"];
  // The twist has snapshotted the design. A save in the first moments may be
  // a late edit from before it, so it lands in both versions; after that,
  // teams adapt the copy they carry on with.
  const withinGrace = phaseStartedAt !== null && now - new Date(phaseStartedAt).getTime() <= DESIGN_SAVE_GRACE_SECONDS * 1000;
  if (phase === "twist") return withinGrace ? ["before_twist", "after_twist"] : ["after_twist"];
  // Just after the canvas locks, a last edit still lands.
  if (withinGrace && phase === "prioritise") return ["current"];
  return [];
}

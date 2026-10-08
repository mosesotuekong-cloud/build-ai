import { describe, expect, it } from "vitest";
import { isMeaningfulChange, pickEarnableMessage, type EarnableMessage } from "@/lib/coach/earn-back";

describe("meaningful changes", () => {
  it("counts a slot going from empty to a real answer", () => {
    expect(isMeaningfulChange("", "A new hire accepts the offer")).toBe(true);
  });

  it("ignores spaces, case and tiny edits", () => {
    expect(isMeaningfulChange("Form submitted", "  form   SUBMITTED ")).toBe(false);
    expect(isMeaningfulChange("Form submitted", "Form submited")).toBe(false);
    expect(isMeaningfulChange("", "ok")).toBe(false);
  });

  it("counts a real rewrite", () => {
    expect(isMeaningfulChange("Form submitted", "The employee submits the leave form on the intranet")).toBe(true);
  });
});

describe("which coach message pays out", () => {
  const m = (id: string, slot: string | null, created: string, earned: string | null = null, role: "team" | "coach" = "coach"): EarnableMessage => ({
    id,
    role,
    slot,
    token_earned_at: earned,
    created_at: created,
  });

  it("picks the latest unpaid coach message about the slot", () => {
    const messages = [m("a", "trigger", "2026-10-10T10:00:00Z"), m("b", "trigger", "2026-10-10T10:05:00Z"), m("c", "decision", "2026-10-10T10:06:00Z")];
    expect(pickEarnableMessage(messages, "trigger")?.id).toBe("b");
  });

  it("never pays twice for the same message, or for team messages", () => {
    const messages = [m("a", "trigger", "2026-10-10T10:00:00Z", "2026-10-10T10:01:00Z"), m("b", "trigger", "2026-10-10T10:02:00Z", null, "team")];
    expect(pickEarnableMessage(messages, "trigger")).toBeNull();
  });

  it("pays nothing when the coach never asked about that slot", () => {
    expect(pickEarnableMessage([m("a", "general", "2026-10-10T10:00:00Z")], "trigger")).toBeNull();
  });
});

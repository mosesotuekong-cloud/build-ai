import { z } from "zod";
import { aiForOrg } from "@/lib/ai/for-org";
import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import { runCoachTurn } from "@/lib/coach/engine";
import { loadCoachHistory, loadPlayerTeam } from "@/lib/play/load";
import { readSettings } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ teamId: z.uuid(), slot: z.enum(CANVAS_SLOTS) });
const INLINE_PHASES = new Set(["solving", "solving_after_twist"]);

// The proactive inline coach: one short, free question beside a slot that is
// still empty after the session's idle delay. The server decides whether it
// is due, so phones can't trigger it early, and a unique index means a slot
// gets at most one inline question however many teammates' phones ask.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { teamId, slot } = parsed.data;

  const data = await loadPlayerTeam(teamId);
  if (!data || !data.case) return Response.json({ error: "Not your team." }, { status: 403 });
  const settings = readSettings(data.session.settings);
  if (!INLINE_PHASES.has(data.session.phase) || !settings.coach_enabled || !settings.inline_coach) {
    return Response.json({ error: "Not now." }, { status: 409 });
  }
  if (data.design[slot].trim()) return Response.json({ error: "That slot has been started." }, { status: 409 });

  const startedAt = data.session.phase_started_at ? new Date(data.session.phase_started_at).getTime() : Date.now();
  if (Date.now() - startedAt < settings.inline_idle_minutes * 60_000) return Response.json({ error: "Too early." }, { status: 409 });

  const admin = createAdminClient();
  const existing = async () =>
    admin.from("coach_messages").select("id, type, slot, content, trigger").eq("team_id", teamId).eq("trigger", "inline_idle").eq("role", "coach").eq("slot", slot).maybeSingle();
  const found = await existing();
  if (found.data) return Response.json({ message: found.data });

  const history = await loadCoachHistory(teamId);
  // A coach turn is the reply plus its leak check.
  const result = await runCoachTurn(
    await aiForOrg(data.session.org_id, 2, admin),
    { case: data.case, design: data.design, phase: data.session.phase, twist: data.twist?.content ?? null, platforms: data.session.target_platforms, history },
    "question",
    `(No message from the team. The ${SLOT_LABELS[slot].title} slot is still empty after a few minutes. Ask one short, friendly question, under 25 words, that helps them make a start on the ${SLOT_LABELS[slot].title} slot. Do not suggest an answer.)`,
  );

  // A duplicate-key error means another phone won the race; return theirs.
  const { data: saved } = await admin
    .from("coach_messages")
    .insert({ team_id: teamId, role: "coach", type: "question", slot, content: result.reply.text, trigger: "inline_idle", tokens_spent: 0 })
    .select("id, type, slot, content, trigger")
    .maybeSingle();
  const message = saved ?? (await existing()).data;
  return message ? Response.json({ message }) : Response.json({ error: "Try again." }, { status: 500 });
}

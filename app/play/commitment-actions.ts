"use server";

import { z } from "zod";
import { loadPlayerTeam } from "@/lib/play/load";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
const COMMITMENT_MAX_DAYS = 30;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const commitmentSchema = z.object({
  owner_name: z.string().trim().min(1, "Who owns this? Add a name.").max(80),
  owner_email: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null)
    .pipe(z.email("That email doesn't look right.").nullable()),
  first_step: z.string().trim().min(5, "Describe one first step.").max(300),
  due_date: z.iso.date("Pick a due date."),
});
export type CommitmentInput = z.input<typeof commitmentSchema>;

// The team's commitment: an owner, one first step and a due date within 30
// days. Any player on the team can write or update it during the
// commitments phase. A follow-up job is queued for the due date; nothing is
// sent yet (the n8n follow-up is mocked locally), and the owner's email stays
// in our database.
export async function saveCommitment(teamId: string, input: CommitmentInput): Promise<{ ok: boolean; message?: string }> {
  const parsed = commitmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data) return { ok: false, message: "You're not on this team." };
  if (data.session.phase !== "commitments") return { ok: false, message: "Commitments open after the reveal." };

  const today = new Date();
  const latest = new Date(today.getTime() + COMMITMENT_MAX_DAYS * 86_400_000);
  if (parsed.data.due_date < isoDate(today) || parsed.data.due_date > isoDate(latest)) {
    return { ok: false, message: `Pick a date in the next ${COMMITMENT_MAX_DAYS} days.` };
  }

  const admin = createAdminClient();
  const { data: saved, error } = await admin
    .from("commitments")
    .upsert({ session_id: data.session.id, team_id: data.team.id, ...parsed.data, follow_up_status: "queued" }, { onConflict: "team_id" })
    .select("id")
    .single();
  if (error || !saved) return { ok: false, message: "We couldn't save that. Please try again." };

  // Queue the follow-up for the due date (one job per commitment). The job
  // carries ids only; n8n will read the rest when it runs.
  const { data: existing } = await admin.from("jobs").select("id").eq("type", "commitment-follow-up").contains("payload", { commitment_id: saved.id }).maybeSingle();
  const payload = { commitment_id: saved.id, due_date: parsed.data.due_date };
  if (existing) await admin.from("jobs").update({ payload, status: "queued" }).eq("id", existing.id);
  else await admin.from("jobs").insert({ org_id: data.session.org_id, type: "commitment-follow-up", status: "queued", payload });
  return { ok: true };
}

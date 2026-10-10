import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { readServerEnv } from "@/lib/config/env";
import { HR_DEFAULT_CASES, HR_DEFAULT_DECK_NAME } from "@/lib/decks/hr-default";
import { sampleReportInput, sampleReportProse } from "@/lib/report/fixtures";
import { buildOpportunityMap } from "@/lib/report/map";
import { generateJoinCode } from "@/lib/session/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOT_TEAMS, DEMO_REPORT_PREFIX, DEMO_ROOM_PREFIX, DEMO_STACK, VISITOR_TEAM } from "./content";

type Admin = ReturnType<typeof createAdminClient>;

const SANDBOX_HOURS = 24;

// Short phases, cases already handed out, and no solo warm-up (bots can't
// do it). Everything else as in a real session.
export const DEMO_ROOM_SETTINGS = {
  before_after_check: false,
  case_mode: "facilitator_assigns",
  minutes: { fix: 2, solving: 5, twist: 3, prioritise: 2, commitments: 2 },
} as const;

export function hashIp(ip: string): string {
  const env = readServerEnv();
  return createHash("sha256")
    .update(`${env.DEMO_IP_SALT ?? env.SUPABASE_SERVICE_ROLE_KEY ?? "builda"}:${ip}`)
    .digest("hex");
}

export type SandboxResult = { ok: true; orgId: string } | { ok: false; message: string };

// Builds a visitor's sandbox: a demo organisation with the HR deck, a live
// room with bot teams (the visitor is on one of them), and a finished sample
// report. Everything cascades away when the organisation is purged.
export async function createSandbox(userId: string, ipHash: string, admin: Admin = createAdminClient()): Promise<SandboxResult> {
  const env = readServerEnv();
  if (!env.DEMO_ENABLED) return { ok: false, message: "The demo is switched off right now." };

  // Housekeeping: clear expired sandboxes whenever a new one starts.
  await admin.rpc("purge_expired_demos");

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("demo_starts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= env.DEMO_STARTS_PER_IP_PER_DAY) {
    return { ok: false, message: "You've started a lot of demos today. Please come back tomorrow, or sign up to keep going." };
  }

  const expires = new Date(Date.now() + SANDBOX_HOURS * 3_600_000).toISOString();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: "Demo sandbox",
      slug: `demo-${randomBytes(5).toString("hex")}`,
      is_demo: true,
      demo_expires_at: expires,
      demo_ai_units: env.DEMO_AI_UNITS,
      session_credits: 2,
      ai_stack: DEMO_STACK,
    })
    .select("id")
    .single();
  if (orgError || !org) return { ok: false, message: "We couldn't set up your demo. Please try again." };

  try {
    await admin.from("demo_starts").insert({ ip_hash: ipHash, org_id: org.id });
    await must(admin.from("org_members").insert({ org_id: org.id, user_id: userId, role: "admin" }));

    // The deck: the six HR cards.
    const { data: deck } = await must(
      admin
        .from("decks")
        .insert({
          org_id: org.id,
          name: HR_DEFAULT_DECK_NAME,
          industry: "Any",
          company_size: "Any",
          tools: ["WhatsApp", "Excel", "Email", "Paper forms"],
          function_slugs: ["hr"],
          target_platforms: DEMO_STACK,
          created_by: userId,
        })
        .select("id")
        .single(),
    );
    const { data: cases } = await must(
      admin
        .from("cases")
        .insert(HR_DEFAULT_CASES.map((c, i) => ({ ...c, deck_id: deck!.id, function_slug: "hr", source: "library" as const, position: i })))
        .select("id, title"),
    );
    const caseId = (title: string) => cases!.find((c) => c.title === title)?.id ?? null;

    await buildRoom(admin, { orgId: org.id, deckId: deck!.id, userId, caseId });
    await buildSampleReport(admin, { orgId: org.id, deckId: deck!.id, userId });
    return { ok: true, orgId: org.id };
  } catch (error) {
    console.error("Demo sandbox failed:", error instanceof Error ? error.message : error);
    await admin.from("organizations").delete().eq("id", org.id);
    return { ok: false, message: "We couldn't set up your demo. Please try again." };
  }
}

// A live session already in the lobby, with three bot teams whose designs
// are written and one team for the visitor, half done.
async function buildRoom(admin: Admin, ctx: { orgId: string; deckId: string; userId: string; caseId: (title: string) => string | null }) {
  const now = new Date().toISOString();
  let session: { id: string } | null = null;
  for (let attempt = 0; attempt < 5 && !session; attempt++) {
    const { data } = await admin
      .from("sessions")
      .insert({
        org_id: ctx.orgId,
        deck_id: ctx.deckId,
        mode: "live",
        name: `${DEMO_ROOM_PREFIX}HR automation sprint`,
        phase: "lobby",
        phase_started_at: now,
        started_at: now,
        join_code: generateJoinCode(),
        target_platforms: DEMO_STACK,
        settings: DEMO_ROOM_SETTINGS,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    session = data;
  }
  if (!session) throw new Error("Could not create the demo room.");

  for (const team of [VISITOR_TEAM, ...BOT_TEAMS]) {
    const { data: row } = await must(
      admin.from("teams").insert({ session_id: session.id, name: team.name, case_id: ctx.caseId(team.caseTitle), hint_tokens_remaining: 5 }).select("id").single(),
    );
    await must(admin.from("designs").insert({ team_id: row!.id, version: "before_twist", ...team.design }));
    if (team === VISITOR_TEAM) {
      await must(admin.from("players").insert({ session_id: session.id, team_id: row!.id, user_id: ctx.userId, display_name: "You" }));
    }
  }
  return session.id;
}

// A finished workshop with its opportunity map, so the visitor can see the
// payoff without running a whole session. Uses the sample data, no AI.
async function buildSampleReport(admin: Admin, ctx: { orgId: string; deckId: string; userId: string }) {
  const { data: session } = await must(
    admin
      .from("sessions")
      .insert({
        org_id: ctx.orgId,
        deck_id: ctx.deckId,
        mode: "live",
        name: `${DEMO_REPORT_PREFIX}HR automation sprint`,
        phase: "closed",
        started_at: sampleReportInput.session.date,
        target_platforms: sampleReportInput.session.platforms,
        settings: {},
        created_by: ctx.userId,
      })
      .select("id")
      .single(),
  );
  const map = buildOpportunityMap({ ...sampleReportInput, session: { ...sampleReportInput.session, orgName: "Sample company" } });
  await must(
    admin.from("reports").insert({
      session_id: session!.id,
      org_id: ctx.orgId,
      status: "done",
      map,
      prose: sampleReportProse,
      prose_source: "ai",
      generated_at: new Date().toISOString(),
    }),
  );
}

async function must<T extends { error: { message: string } | null }>(query: PromiseLike<T>): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result;
}

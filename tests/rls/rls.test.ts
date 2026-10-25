// Row-level security, tested against the local Supabase stack with real
// signed-in users. Proves organisations can't see each other's data, player
// names stay inside their session, and phase changes can't be made from the
// browser. Run with: npm run test:rls (needs `npm run db:start`).
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/types";

config({ path: ".env.local", quiet: true });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
type Client = SupabaseClient<Database>;

const service: Client = createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });
const run = randomBytes(4).toString("hex");
const password = `rls-${randomBytes(12).toString("hex")}`;
const createdUsers: string[] = [];
const createdOrgs: string[] = [];

async function staffUser(label: string): Promise<{ client: Client; id: string }> {
  const email = `rls-${label}-${run}@builda.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  createdUsers.push(data.user.id);
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

async function anonUser(): Promise<{ client: Client; id: string }> {
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("no anon user");
  createdUsers.push(data.user.id);
  return { client, id: data.user.id };
}

async function org(name: string, extra: Partial<Database["public"]["Tables"]["organizations"]["Insert"]> = {}) {
  const { data, error } = await service
    .from("organizations")
    .insert({ name, slug: `rls-${name.toLowerCase().replace(/\W+/g, "-")}-${run}`, session_credits: 5, ...extra })
    .select("id")
    .single();
  if (error || !data) throw error;
  createdOrgs.push(data.id);
  return data.id;
}

// A live session in an organisation, with two teams, a named player on team
// one, designs, a coach message, a commitment, an idea and a report.
async function room(orgId: string, playerId: string) {
  const { data: deck } = await service.from("decks").insert({ org_id: orgId, name: "RLS deck", function_slugs: ["hr"] }).select("id").single();
  const { data: c } = await service.from("cases").insert({ deck_id: deck!.id, function_slug: "hr", title: "RLS case", story: "A story long enough.", cost: "", who_feels_it: "", source: "library", position: 0 }).select("id").single();
  const { data: session } = await service.from("sessions").insert({ org_id: orgId, deck_id: deck!.id, mode: "live", name: "RLS room", phase: "solving", settings: {} }).select("id").single();
  const { data: team1 } = await service.from("teams").insert({ session_id: session!.id, name: "Team One", case_id: c!.id }).select("id").single();
  const { data: team2 } = await service.from("teams").insert({ session_id: session!.id, name: "Team Two", case_id: c!.id }).select("id").single();
  await service.from("players").insert({ session_id: session!.id, team_id: team1!.id, user_id: playerId, display_name: "Adaeze Secret" });
  await service.from("designs").insert([
    { team_id: team1!.id, version: "before_twist", trigger: "Team one trigger" },
    { team_id: team2!.id, version: "before_twist", trigger: "Team two trigger" },
  ]);
  await service.from("coach_messages").insert({ team_id: team2!.id, role: "coach", content: "A private question for team two" });
  await service.from("commitments").insert({ session_id: session!.id, team_id: team1!.id, owner_name: "Adaeze Secret", owner_email: "adaeze@example.com", first_step: "Ask IT for access", due_date: "2026-12-01" });
  await service.from("ideas").insert({ session_id: session!.id, team_id: team1!.id, title: "Paper forms", what_happens: "Forms go round on paper." });
  await service.from("reports").insert({ session_id: session!.id, org_id: orgId, status: "done", map: {}, prose: {} });
  return { deckId: deck!.id, sessionId: session!.id, team1: team1!.id, team2: team2!.id };
}

let a: Awaited<ReturnType<typeof room>>;
let staffA: { client: Client; id: string };
let staffB: { client: Client; id: string };
let player: { client: Client; id: string };
let stranger: { client: Client; id: string };
let demoVisitor: { client: Client; id: string };

beforeAll(async () => {
  const orgA = await org("Alpha");
  const orgB = await org("Bravo");
  const demo = await org("Sandbox", { is_demo: true, demo_expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  [staffA, staffB, player, stranger, demoVisitor] = await Promise.all([staffUser("a"), staffUser("b"), anonUser(), anonUser(), anonUser()]);
  await service.from("org_members").insert([
    { org_id: orgA, user_id: staffA.id, role: "admin" },
    { org_id: orgB, user_id: staffB.id, role: "admin" },
    { org_id: demo, user_id: demoVisitor.id, role: "admin" },
  ]);
  a = await room(orgA, player.id);
}, 60_000);

afterAll(async () => {
  for (const id of createdOrgs) await service.from("organizations").delete().eq("id", id);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

const TABLES_BY_SESSION = ["players", "ideas", "commitments", "reports"] as const;

describe("organisations are sealed off from each other", () => {
  it("staff see their own organisation's room", async () => {
    expect((await staffA.client.from("sessions").select("id").eq("id", a.sessionId)).data).toHaveLength(1);
    expect((await staffA.client.from("players").select("display_name").eq("session_id", a.sessionId)).data).toEqual([{ display_name: "Adaeze Secret" }]);
  });

  it("staff in another organisation see nothing of it", async () => {
    expect((await staffB.client.from("sessions").select("id").eq("id", a.sessionId)).data).toEqual([]);
    expect((await staffB.client.from("decks").select("id").eq("id", a.deckId)).data).toEqual([]);
    expect((await staffB.client.from("teams").select("id").eq("session_id", a.sessionId)).data).toEqual([]);
    for (const table of TABLES_BY_SESSION) {
      expect((await staffB.client.from(table).select("session_id").eq("session_id", a.sessionId)).data, table).toEqual([]);
    }
    expect((await staffB.client.from("designs").select("id").in("team_id", [a.team1, a.team2])).data).toEqual([]);
    expect((await staffB.client.from("coach_messages").select("id").eq("team_id", a.team2)).data).toEqual([]);
  });

  it("a demo visitor sees nothing of a real organisation", async () => {
    expect((await demoVisitor.client.from("sessions").select("id").eq("id", a.sessionId)).data).toEqual([]);
    expect((await demoVisitor.client.from("players").select("id").eq("session_id", a.sessionId)).data).toEqual([]);
  });

  it("only platform admins can read the credit history", async () => {
    expect((await staffA.client.from("credit_grants").select("id")).data).toEqual([]);
  });
});

describe("player names and team work stay where they belong", () => {
  it("a player sees their own team's design, not another team's coach chat", async () => {
    expect((await player.client.from("designs").select("trigger").eq("team_id", a.team1)).data).toEqual([{ trigger: "Team one trigger" }]);
    expect((await player.client.from("coach_messages").select("id").eq("team_id", a.team2)).data).toEqual([]);
  });

  it("someone outside the session can't read its player names or commitments", async () => {
    expect((await stranger.client.from("players").select("display_name").eq("session_id", a.sessionId)).data).toEqual([]);
    expect((await stranger.client.from("commitments").select("owner_email").eq("session_id", a.sessionId)).data).toEqual([]);
    expect((await stranger.client.from("designs").select("id").eq("team_id", a.team1)).data).toEqual([]);
  });

  it("players can't read the report", async () => {
    expect((await player.client.from("reports").select("id").eq("session_id", a.sessionId)).data).toEqual([]);
  });
});

describe("phase changes and credits are server-only", () => {
  it("a player can't move the session on", async () => {
    await player.client.from("sessions").update({ phase: "reveal" }).eq("id", a.sessionId);
    const { data } = await service.from("sessions").select("phase").eq("id", a.sessionId).single();
    expect(data?.phase).toBe("solving");
  });

  it("staff can't edit another organisation's session, or grant themselves credits", async () => {
    await staffB.client.from("sessions").update({ name: "Hijacked" }).eq("id", a.sessionId);
    const { data } = await service.from("sessions").select("name").eq("id", a.sessionId).single();
    expect(data?.name).toBe("RLS room");
    const { error } = await staffA.client.rpc("grant_session_credits", { target_org: createdOrgs[0], amount: 100, reason: "", granted_by: staffA.id });
    expect(error).not.toBeNull();
    const { error: spendError } = await player.client.rpc("spend_hint_tokens", { target_team: a.team1, amount: -50 });
    expect(spendError).not.toBeNull();
  });
});

// Quick discovery against the local Supabase stack: who can read and write
// discoveries, and the AI allowance function the server relies on. (The
// allowance once failed on every call and nobody noticed, because a failure
// quietly switches to scripted replies; these tests call it for real.)
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/types";

config({ path: ".env.local", quiet: true });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const service = createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });
const users: string[] = [];

async function visitor() {
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("no user");
  users.push(data.user.id);
  return { client, id: data.user.id };
}

let owner: Awaited<ReturnType<typeof visitor>>;
let stranger: Awaited<ReturnType<typeof visitor>>;
let id: string;

beforeAll(async () => {
  owner = await visitor();
  stranger = await visitor();
  const { data, error } = await service
    .from("discoveries")
    .insert({ user_id: owner.id, function_slug: "finance", ip_hash: `rls-${randomBytes(4).toString("hex")}` })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("no discovery");
  id = data.id;
});

afterAll(async () => {
  for (const u of users) await service.auth.admin.deleteUser(u);
});

describe("discoveries: access", () => {
  it("the owner can read it, a stranger can't", async () => {
    expect((await owner.client.from("discoveries").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await stranger.client.from("discoveries").select("id").eq("id", id)).data).toHaveLength(0);
  });

  it("nobody writes from the browser, not even the owner", async () => {
    expect((await owner.client.from("discoveries").update({ ai_units: 0 }).eq("id", id)).error).not.toBeNull();
    expect((await owner.client.from("discoveries").insert({ user_id: owner.id, function_slug: "hr" })).error).not.toBeNull();
  });

  it("visitors can't read or write pilot events, even for their own discovery", async () => {
    await service.from("discovery_events").insert({ discovery_id: id, kind: "started", data: {} });
    const read = await owner.client.from("discovery_events").select("id").eq("discovery_id", id);
    expect(read.error !== null || (read.data ?? []).length === 0).toBe(true);
    expect((await owner.client.from("discovery_events").insert({ discovery_id: id, kind: "feedback", data: {} })).error).not.toBeNull();
  });

  it("visitors can't spend the AI allowance themselves", async () => {
    const { error } = await owner.client.rpc("spend_discovery_ai", { target: id, units: 1, per_discovery: 20, daily_limit: 1500 });
    expect(error).not.toBeNull();
  });
});

describe("discoveries: AI allowance", () => {
  const spend = (units: number, per = 20, daily = 1_000_000) => service.rpc("spend_discovery_ai", { target: id, units, per_discovery: per, daily_limit: daily });
  const used = async () => (await service.from("discoveries").select("ai_units").eq("id", id).single()).data!.ai_units;

  it("spends within the allowance", async () => {
    const r = await spend(2);
    expect(r.error).toBeNull();
    expect(r.data).toBe(true);
    expect(await used()).toBe(2);
  });

  it("refuses beyond the discovery's allowance and spends nothing", async () => {
    const r = await spend(50);
    expect(r.error).toBeNull();
    expect(r.data).toBe(false);
    expect(await used()).toBe(2);
  });

  it("refuses beyond today's total and gives the units back", async () => {
    const r = await spend(1, 20, 0);
    expect(r.error).toBeNull();
    expect(r.data).toBe(false);
    expect(await used()).toBe(2);
  });
});

// Creates local users, the demo organisation, memberships and the library
// HR deck. Runs after `supabase db reset` (see `npm run db:reset`). Safe to re-run.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { HR_DEFAULT_CASES, HR_DEFAULT_DECK_NAME } from "@/lib/decks/hr-default";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY missing. Run `npm run env:local` first.");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error(`Refusing to seed users into a non-local Supabase (${url}).`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? "otumosesjobs@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Plenty of credits locally; every test run opens a lobby and uses one.
const DEMO_ORG = { name: "Demo Company Ltd", slug: "demo-company", session_credits: 100 };
const FACILITATOR_EMAIL = "facilitator@builda.test";
const PENDING_EMAIL = "pending@builda.test"; // signed up but not in any org
// One facilitator per end-to-end test file, so parallel sign-ins never cancel
// each other's magic links.
const E2E_EMAILS = ["e2e-decks@builda.test", "e2e-session@builda.test", "e2e-coach@builda.test", "e2e-short@builda.test"];

async function ensureUser(email: string): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);
  return data.user.id;
}

async function main() {
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .upsert(DEMO_ORG, { onConflict: "slug" })
    .select("id")
    .single();
  if (orgError) throw orgError;

  const facilitatorId = await ensureUser(FACILITATOR_EMAIL);
  await ensureUser(PENDING_EMAIL);

  const members = [{ org_id: org.id, user_id: facilitatorId, role: "admin" as const }];
  for (const email of E2E_EMAILS) members.push({ org_id: org.id, user_id: await ensureUser(email), role: "admin" });

  for (const email of superAdmins) {
    const id = await ensureUser(email);
    const { error } = await admin.from("platform_admins").upsert({ user_id: id, email });
    if (error) throw error;
    // Super admins are also members of the demo org so they can try everything.
    members.push({ org_id: org.id, user_id: id, role: "admin" });
  }

  const { error: memberError } = await admin.from("org_members").upsert(members, { onConflict: "org_id,user_id" });
  if (memberError) throw memberError;

  await seedLibraryHrDeck();

  console.log("Seeded local users:");
  console.log(`  ${FACILITATOR_EMAIL}  admin of ${DEMO_ORG.name}`);
  for (const email of superAdmins) console.log(`  ${email}  super admin, admin of ${DEMO_ORG.name}`);
  console.log(`  ${PENDING_EMAIL}  no organisation (sees the waiting page)`);
  console.log(`  ${E2E_EMAILS.join(", ")}  test accounts for Playwright`);
  console.log(`Library deck: ${HR_DEFAULT_DECK_NAME} (${HR_DEFAULT_CASES.length} HR cases)`);
}

// The default HR deck lives in the shared library (org_id is null), so every
// organisation can copy it. Rebuilt from lib/decks/hr-default.ts on each run.
async function seedLibraryHrDeck() {
  const { data: existing } = await admin.from("decks").select("id").is("org_id", null).eq("name", HR_DEFAULT_DECK_NAME);
  if (existing?.length) {
    const { error } = await admin.from("decks").delete().in("id", existing.map((d) => d.id));
    if (error) throw error;
  }
  const { data: deck, error } = await admin
    .from("decks")
    .insert({
      org_id: null,
      name: HR_DEFAULT_DECK_NAME,
      industry: "Any",
      company_size: "Any",
      tools: ["WhatsApp", "Excel", "Email", "Paper forms"],
      function_slugs: ["hr"],
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: casesError } = await admin.from("cases").insert(
    HR_DEFAULT_CASES.map((c, i) => ({ deck_id: deck.id, function_slug: "hr", source: "library" as const, position: i, ...c })),
  );
  if (casesError) throw casesError;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

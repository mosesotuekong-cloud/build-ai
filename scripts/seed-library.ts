// Loads the shared library decks (the HR essentials deck) into any Supabase
// project, including production. Creates nothing else: no users, no
// organisations, no credits. Skips a deck that is already there.
//
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed:library
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { HR_DEFAULT_CASES, HR_DEFAULT_DECK_NAME } from "@/lib/decks/hr-default";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: existing } = await admin.from("decks").select("id").is("org_id", null).eq("name", HR_DEFAULT_DECK_NAME).maybeSingle();
  if (existing) {
    console.log(`Library deck "${HR_DEFAULT_DECK_NAME}" is already there. Nothing to do.`);
    return;
  }
  const { data: deck, error } = await admin
    .from("decks")
    .insert({ org_id: null, name: HR_DEFAULT_DECK_NAME, industry: "Any", company_size: "Any", tools: ["WhatsApp", "Excel", "Email", "Paper forms"], function_slugs: ["hr"] })
    .select("id")
    .single();
  if (error || !deck) throw error ?? new Error("Could not create the deck");
  const { error: casesError } = await admin
    .from("cases")
    .insert(HR_DEFAULT_CASES.map((c, i) => ({ deck_id: deck.id, function_slug: "hr", source: "library" as const, position: i, ...c })));
  if (casesError) throw casesError;
  console.log(`Library deck "${HR_DEFAULT_DECK_NAME}" added (${HR_DEFAULT_CASES.length} cases) to ${new URL(url).host}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

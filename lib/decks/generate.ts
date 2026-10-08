import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { N8nClient } from "@/lib/n8n";
import { functionName } from "./schemas";

export type GenerationResult = { slug: string; ok: true; count: number } | { slug: string; ok: false; message: string };

type DeckContext = {
  id: string;
  org_id: string;
  industry: string;
  company_size: string;
  tools: string[];
  country: string;
  pain_points: string;
};

// Generates six cases for each function through the n8n client (or its local
// fallback), appends them to the deck, and logs each run in `jobs`. Functions
// run in parallel and fail independently, so one bad response never loses the
// others.
export async function generateCasesForDeck(
  supabase: SupabaseClient<Database>,
  n8n: N8nClient,
  deck: DeckContext,
  slugs: string[],
  userId: string,
): Promise<GenerationResult[]> {
  return Promise.all(slugs.map((slug) => generateOne(supabase, n8n, deck, slug, userId)));
}

async function generateOne(
  supabase: SupabaseClient<Database>,
  n8n: N8nClient,
  deck: DeckContext,
  slug: string,
  userId: string,
): Promise<GenerationResult> {
  const payload = {
    function_slug: slug,
    function_name: functionName(slug),
    industry: deck.industry || "General business",
    company_size: deck.company_size || "Not specified",
    tools: deck.tools,
    country: deck.country || "Nigeria",
    pain_points: deck.pain_points || undefined,
  };

  const { data: job } = await supabase
    .from("jobs")
    .insert({ org_id: deck.org_id, type: "generate-cases", status: "running", payload: { deck_id: deck.id, ...payload }, created_by: userId })
    .select("id")
    .single();

  try {
    const result = await n8n.run("generate-cases", payload);

    const { data: existing } = await supabase.from("cases").select("position").eq("deck_id", deck.id).eq("function_slug", slug);
    const start = (existing ?? []).reduce((max, c) => Math.max(max, c.position + 1), 0);

    const { error } = await supabase.from("cases").insert(
      result.cases.map((c, i) => ({ deck_id: deck.id, function_slug: slug, source: "ai" as const, position: start + i, ...c })),
    );
    if (error) throw new Error(`Could not save cases: ${error.message}`);

    if (job) await supabase.from("jobs").update({ status: "succeeded", result: { count: result.cases.length } }).eq("id", job.id);
    return { slug, ok: true, count: result.cases.length };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Case generation failed for ${slug}:`, detail);
    if (job) await supabase.from("jobs").update({ status: "failed", error: detail.slice(0, 500) }).eq("id", job.id);
    return { slug, ok: false, message: `We couldn't write ${functionName(slug)} cases this time.` };
  }
}

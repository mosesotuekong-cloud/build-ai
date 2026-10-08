"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { generateCasesForDeck } from "@/lib/decks/generate";
import { moveItem, nextPosition } from "@/lib/decks/ordering";
import {
  caseFormSchema,
  deckDetailsSchema,
  fieldErrors,
  functionName,
  functionSlugSchema,
  newDeckSchema,
  parseTools,
} from "@/lib/decks/schemas";
import { getN8nClient } from "@/lib/n8n";
import { createClient } from "@/lib/supabase/server";

export type FormState = { status: "idle" | "error" | "saved"; message?: string; errors?: Record<string, string> };

const idSchema = z.uuid();

// Every deck action needs a signed-in facilitator with an active organisation.
// RLS is the real gatekeeper; this gives a friendly message first.
async function context() {
  const ctx = await requireFacilitator();
  if (!ctx.activeOrg) throw new Error("You need an organisation to manage decks.");
  return { ctx, org: ctx.activeOrg, supabase: await createClient() };
}

function readDetails(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    company_size: String(formData.get("company_size") ?? ""),
    tools: parseTools(String(formData.get("tools") ?? "")),
    country: String(formData.get("country") ?? "Nigeria"),
    pain_points: String(formData.get("pain_points") ?? ""),
  };
}

function failedQuery(results: { slug: string; ok: boolean }[]) {
  const failed = results.filter((r) => !r.ok).map((r) => r.slug);
  return failed.length ? `?failed=${failed.join(",")}` : "";
}

export async function createDeck(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newDeckSchema.safeParse({
    ...readDetails(formData),
    function_slugs: formData.getAll("function_slugs").map(String),
    mode: formData.get("mode"),
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), message: "A few things need fixing." };

  const { ctx, org, supabase } = await context();
  const { function_slugs, mode, ...details } = parsed.data;
  const { data: deck, error } = await supabase
    .from("decks")
    .insert({ ...details, function_slugs, org_id: org.orgId, created_by: ctx.userId })
    .select("id, org_id, industry, company_size, tools, country, pain_points")
    .single();
  if (error || !deck) return { status: "error", message: "We couldn't create the deck. Please try again." };

  let query = "";
  if (mode === "generate") {
    const results = await generateCasesForDeck(supabase, getN8nClient(), { ...deck, org_id: org.orgId }, function_slugs, ctx.userId);
    query = failedQuery(results);
  }
  revalidatePath("/console/decks");
  redirect(`/console/decks/${deck.id}${query}`);
}

export async function updateDeckDetails(deckId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = deckDetailsSchema.safeParse(readDetails(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), message: "A few things need fixing." };
  const { supabase } = await context();
  const { error } = await supabase.from("decks").update(parsed.data).eq("id", idSchema.parse(deckId));
  if (error) return { status: "error", message: "We couldn't save the deck details." };
  revalidatePath(`/console/decks/${deckId}`);
  return { status: "saved", message: "Saved." };
}

export async function deleteDeck(deckId: string) {
  const { supabase } = await context();
  await supabase.from("decks").delete().eq("id", idSchema.parse(deckId));
  revalidatePath("/console/decks");
  redirect("/console/decks");
}

// Copies a library deck (such as the default HR deck) into the organisation.
export async function copyLibraryDeck(libraryDeckId: string) {
  const { ctx, org, supabase } = await context();
  const { data: source } = await supabase
    .from("decks")
    .select("*, cases (function_slug, title, story, cost, who_feels_it, position)")
    .eq("id", idSchema.parse(libraryDeckId))
    .is("org_id", null)
    .single();
  if (!source) throw new Error("Library deck not found.");

  const { data: deck, error } = await supabase
    .from("decks")
    .insert({
      org_id: org.orgId,
      name: source.name,
      industry: source.industry,
      company_size: source.company_size,
      tools: source.tools,
      country: source.country,
      pain_points: source.pain_points,
      function_slugs: source.function_slugs,
      copied_from: source.id,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !deck) throw new Error("Could not copy the deck.");

  if (source.cases.length) {
    await supabase.from("cases").insert(source.cases.map((c) => ({ ...c, deck_id: deck.id, source: "library" as const })));
  }
  revalidatePath("/console/decks");
  redirect(`/console/decks/${deck.id}`);
}

// Adds functions to a deck, optionally asking the AI for six cases each.
export async function addFunctions(deckId: string, slugs: string[], generate: boolean) {
  const valid = z.array(functionSlugSchema).min(1).parse(slugs);
  const { ctx, org, supabase } = await context();
  const { data: deck } = await supabase
    .from("decks")
    .select("id, org_id, industry, company_size, tools, country, pain_points, function_slugs")
    .eq("id", idSchema.parse(deckId))
    .single();
  if (!deck) throw new Error("Deck not found.");

  const merged = [...deck.function_slugs, ...valid.filter((s) => !deck.function_slugs.includes(s))];
  await supabase.from("decks").update({ function_slugs: merged }).eq("id", deck.id);

  let query = "";
  if (generate) {
    const results = await generateCasesForDeck(supabase, getN8nClient(), { ...deck, org_id: org.orgId }, valid, ctx.userId);
    query = failedQuery(results);
  }
  revalidatePath(`/console/decks/${deck.id}`);
  redirect(`/console/decks/${deck.id}${query}`);
}

// Asks the AI for six more cases for one function; they are added at the end.
export async function dealMoreCases(deckId: string, slug: string): Promise<{ ok: boolean; message?: string }> {
  const { ctx, org, supabase } = await context();
  const { data: deck } = await supabase
    .from("decks")
    .select("id, org_id, industry, company_size, tools, country, pain_points")
    .eq("id", idSchema.parse(deckId))
    .single();
  if (!deck) return { ok: false, message: "Deck not found." };
  const [result] = await generateCasesForDeck(supabase, getN8nClient(), { ...deck, org_id: org.orgId }, [functionSlugSchema.parse(slug)], ctx.userId);
  revalidatePath(`/console/decks/${deckId}`);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

export async function removeFunction(deckId: string, slug: string) {
  const { supabase } = await context();
  const id = idSchema.parse(deckId);
  const valid = functionSlugSchema.parse(slug);
  const { data: deck } = await supabase.from("decks").select("function_slugs").eq("id", id).single();
  if (!deck) return;
  await supabase.from("cases").delete().eq("deck_id", id).eq("function_slug", valid);
  await supabase.from("decks").update({ function_slugs: deck.function_slugs.filter((s) => s !== valid) }).eq("id", id);
  revalidatePath(`/console/decks/${id}`);
}

// Creates a case (caseId null) or updates one.
export async function saveCase(
  deckId: string,
  slug: string,
  caseId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = caseFormSchema.safeParse({
    title: formData.get("title"),
    story: formData.get("story"),
    cost: formData.get("cost") ?? "",
    who_feels_it: formData.get("who_feels_it") ?? "",
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), message: "A few things need fixing." };

  const { supabase } = await context();
  const id = idSchema.parse(deckId);
  if (caseId) {
    const { error } = await supabase.from("cases").update(parsed.data).eq("id", idSchema.parse(caseId)).eq("deck_id", id);
    if (error) return { status: "error", message: "We couldn't save that case." };
  } else {
    const fn = functionSlugSchema.parse(slug);
    const { data: siblings } = await supabase.from("cases").select("id, position").eq("deck_id", id).eq("function_slug", fn);
    const { error } = await supabase
      .from("cases")
      .insert({ ...parsed.data, deck_id: id, function_slug: fn, source: "manual", position: nextPosition(siblings ?? []) });
    if (error) return { status: "error", message: "We couldn't add that case." };
  }
  revalidatePath(`/console/decks/${id}`);
  return { status: "saved", message: caseId ? "Case saved." : `Case added to ${functionName(slug)}.` };
}

export async function deleteCase(deckId: string, caseId: string) {
  const { supabase } = await context();
  await supabase.from("cases").delete().eq("id", idSchema.parse(caseId)).eq("deck_id", idSchema.parse(deckId));
  revalidatePath(`/console/decks/${deckId}`);
}

export async function moveCase(deckId: string, caseId: string, direction: "up" | "down") {
  const { supabase } = await context();
  const id = idSchema.parse(deckId);
  const { data: target } = await supabase.from("cases").select("function_slug").eq("id", idSchema.parse(caseId)).single();
  if (!target) return;
  const { data: siblings } = await supabase.from("cases").select("id, position").eq("deck_id", id).eq("function_slug", target.function_slug);
  const updates = moveItem(siblings ?? [], caseId, direction);
  await Promise.all(updates.map((u) => supabase.from("cases").update({ position: u.position }).eq("id", u.id)));
  revalidatePath(`/console/decks/${id}`);
}

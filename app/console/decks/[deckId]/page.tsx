import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { functionName } from "@/lib/decks/schemas";
import { createClient } from "@/lib/supabase/server";
import { DeckEditor } from "./deck-editor";

export const metadata: Metadata = { title: "Deck" };

export default async function DeckPage({ params, searchParams }: PageProps<"/console/decks/[deckId]">) {
  const { deckId } = await params;
  const { failed } = await searchParams;
  const ctx = await requireFacilitator();
  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, org_id, name, industry, company_size, tools, country, pain_points, target_platforms, function_slugs, cases (id, function_slug, title, story, cost, who_feels_it, source, position)")
    .eq("id", deckId)
    .maybeSingle();
  if (!deck) notFound();

  const editable = Boolean(deck.org_id && deck.org_id === ctx.activeOrg?.orgId);
  const failedSlugs = typeof failed === "string" ? failed.split(",").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <Link href="/console/decks" className="text-sm font-semibold text-green-700 hover:underline">
        ← Decks
      </Link>
      {failedSlugs.length > 0 && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          We couldn&apos;t write cases for {failedSlugs.map(functionName).join(", ")} this time. Use &quot;Deal six more&quot; to try
          again, or write your own.
        </p>
      )}
      <DeckEditor
        deck={{ ...deck, cases: [...deck.cases].sort((a, b) => a.position - b.position) }}
        editable={editable}
        canPlay={Boolean(ctx.activeOrg)}
      />
    </div>
  );
}

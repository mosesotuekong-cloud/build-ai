import type { Metadata } from "next";
import Link from "next/link";
import { DeckTile } from "@/components/decks/deck-tile";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { createClient } from "@/lib/supabase/server";
import { UseLibraryDeckButton } from "./use-library-deck-button";

export const metadata: Metadata = { title: "Decks" };

export default async function DecksPage() {
  const ctx = await requireFacilitator();
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("decks")
    .select("id, org_id, name, industry, function_slugs, updated_at, cases (count)")
    .is("cases.session_id", null)
    .order("updated_at", { ascending: false });

  const own = (decks ?? []).filter((d) => d.org_id && d.org_id === ctx.activeOrg?.orgId);
  const library = (decks ?? []).filter((d) => !d.org_id);
  const count = (d: (typeof own)[number]) => d.cases[0]?.count ?? 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Decks</h1>
          <p className="text-ink-500">Case study decks for your sessions. Build one with AI, start from the library, or write your own.</p>
        </div>
        {ctx.activeOrg && (
          <Link href="/console/decks/new" className={buttonClasses("primary")}>
            New deck
          </Link>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Your decks</h2>
        {own.length === 0 ? (
          <Card className="space-y-2 text-center">
            <p className="font-display text-lg font-bold">No decks yet</p>
            <p className="text-ink-500">Start with the HR deck from the library below, or build a new one for any function.</p>
          </Card>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {own.map((deck) => (
              <li key={deck.id}>
                <DeckTile href={`/console/decks/${deck.id}`} name={deck.name} industry={deck.industry} functions={deck.function_slugs} caseCount={count(deck)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold">Library</h2>
          <p className="text-ink-500">Ready-made decks. Using one copies it into your decks so you can edit it freely.</p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((deck) => (
            <li key={deck.id} className="space-y-3">
              <DeckTile name={deck.name} industry="Works for any company" functions={deck.function_slugs} caseCount={count(deck)} library />
              {ctx.activeOrg && <UseLibraryDeckButton deckId={deck.id} />}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

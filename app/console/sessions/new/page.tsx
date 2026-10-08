import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { createClient } from "@/lib/supabase/server";
import { NewSessionForm } from "./new-session-form";

export const metadata: Metadata = { title: "New session" };

export default async function NewSessionPage({ searchParams }: PageProps<"/console/sessions/new">) {
  const ctx = await requireFacilitator();
  if (!ctx.activeOrg) redirect("/console/sessions");
  const { deck } = await searchParams;
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("decks")
    .select("id, name, function_slugs, cases (count)")
    .eq("org_id", ctx.activeOrg.orgId)
    .order("updated_at", { ascending: false });

  const usable = (decks ?? []).filter((d) => (d.cases[0]?.count ?? 0) > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/console/sessions" className="text-sm font-semibold text-green-700 hover:underline">
        ← Sessions
      </Link>
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">New session</h1>
        <p className="text-ink-500">It stays a free draft until you open the lobby, which uses one of your {ctx.activeOrg.sessionCredits} credits.</p>
      </div>
      {usable.length === 0 ? (
        <Card className="space-y-2">
          <p className="font-display text-lg font-bold">You need a deck with cases first</p>
          <Link href="/console/decks" className="font-semibold text-green-700 hover:underline">
            Go to decks
          </Link>
        </Card>
      ) : (
        <NewSessionForm
          decks={usable.map((d) => ({ id: d.id, name: d.name, cases: d.cases[0]?.count ?? 0, functions: d.function_slugs.length }))}
          defaultDeck={typeof deck === "string" ? deck : undefined}
        />
      )}
    </div>
  );
}

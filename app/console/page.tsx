import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { getMockStatus } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Console" };

const PROVIDER_LABEL = { anthropic: "Anthropic", openai: "OpenAI", mock: "Mock (sample data)" } as const;

export default async function ConsoleHome() {
  const ctx = await requireFacilitator();
  const org = ctx.activeOrg;
  const supabase = await createClient();
  const { count: deckCount } = org
    ? await supabase.from("decks").select("id", { count: "exact", head: true }).eq("org_id", org.orgId)
    : { count: 0 };
  const status = getMockStatus();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="text-ink-500">
          {org ? `You're running sessions for ${org.orgName}.` : "You're signed in as a super admin with no organisation."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/console/decks" className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600">
          <Card className="h-full space-y-2 transition-transform hover:-translate-y-0.5">
            <h2 className="font-display text-lg font-semibold">Decks</h2>
            <p className="font-display text-4xl font-bold text-green-600">{deckCount ?? 0}</p>
            <p className="text-sm text-ink-500">Build and reuse case study decks for each function.</p>
          </Card>
        </Link>
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Sessions</h2>
          <p className="text-sm text-ink-500">Create a session, share the code and run the game live. Coming in the next milestone.</p>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Session credits</h2>
          <p className="font-display text-4xl font-bold text-green-600">{org?.sessionCredits ?? 0}</p>
          <p className="text-sm text-ink-500">One credit is used when a session opens its lobby.</p>
        </Card>
      </div>

      <p className="text-sm text-ink-500">
        AI provider: <strong className="text-ink-700">{PROVIDER_LABEL[status.aiProvider]}</strong>
        {" · "}n8n: <strong className="text-ink-700">{status.mockN8n ? "running locally" : "connected"}</strong>
      </p>
    </div>
  );
}

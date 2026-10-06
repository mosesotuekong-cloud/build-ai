import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { SystemCheck } from "./system-check";

export const metadata: Metadata = { title: "Console" };

export default async function ConsoleHome() {
  const ctx = await requireFacilitator();
  const org = ctx.activeOrg;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="text-ink-500">
          {org ? `You're running sessions for ${org.orgName}.` : "You're signed in as a super admin with no organisation."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Decks</h2>
          <p className="text-sm text-ink-500">Build and reuse case study decks for each function. Coming in the next milestone.</p>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Sessions</h2>
          <p className="text-sm text-ink-500">Create a session, share the code and run the game live.</p>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Session credits</h2>
          <p className="font-display text-4xl font-bold text-forest-600">{org?.sessionCredits ?? 0}</p>
          <p className="text-sm text-ink-500">One credit is used when a session opens its lobby.</p>
        </Card>
      </div>

      <SystemCheck />
    </div>
  );
}

import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { StackForm } from "./stack-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireFacilitator();
  const org = ctx.activeOrg;
  if (!org) {
    return (
      <Card>
        <p className="text-ink-700">You&apos;re not in an organisation, so there&apos;s nothing to set here yet.</p>
      </Card>
    );
  }
  const canEdit = org.role === "admin" || ctx.isPlatformAdmin;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">{org.orgName}</h1>
        <p className="text-ink-500">Settings for your organisation.</p>
      </div>
      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold">Your AI tool stack</h2>
          <p className="text-sm text-ink-500">
            The AI and automation platforms your organisation uses or is considering. New decks start with these. They shape the
            cases the AI writes, the questions the coach asks, and the build guides teams take home.
          </p>
        </div>
        <StackForm orgId={org.orgId} initial={org.aiStack} canEdit={canEdit} />
      </Card>
    </div>
  );
}

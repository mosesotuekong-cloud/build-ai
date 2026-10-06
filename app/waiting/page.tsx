import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/wordmark";
import { getFacilitatorContext } from "@/lib/auth/facilitator";

export const metadata: Metadata = { title: "Waiting for access" };

export default async function WaitingPage() {
  const ctx = await getFacilitatorContext();
  if (!ctx) redirect("/login");
  const hasActiveOrg = ctx.memberships.some((m) => m.orgActive);
  if (hasActiveOrg || ctx.isPlatformAdmin) redirect("/console");
  const hasInactiveOrg = ctx.memberships.length > 0;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <Wordmark />
        <Card className="space-y-4 text-left">
          <h1 className="font-display text-2xl font-bold">You&apos;re signed in, nearly there</h1>
          <p className="text-ink-700">
            {hasInactiveOrg
              ? "Your organisation's account is paused at the moment. Get in touch and we'll sort it out."
              : "Your email isn't linked to an organisation yet. Once we add you, this page will open the console."}
          </p>
          <p className="text-sm text-ink-500">Signed in as {ctx.email}</p>
          <form action="/auth/signout" method="post">
            <button className="text-sm font-semibold text-clay-600 hover:underline">Sign out</button>
          </form>
        </Card>
      </div>
    </main>
  );
}

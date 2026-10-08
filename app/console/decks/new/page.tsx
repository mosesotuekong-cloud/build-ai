import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { NewDeckForm } from "./new-deck-form";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage() {
  const ctx = await requireFacilitator();
  if (!ctx.activeOrg) redirect("/console/decks");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/console/decks" className="text-sm font-semibold text-green-700 hover:underline">
        ← Decks
      </Link>
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">New deck</h1>
        <p className="text-ink-500">
          Tell us a little about the company. The AI writes six real-feeling cases for each function you pick, and you can edit every one.
        </p>
      </div>
      <NewDeckForm orgStack={ctx.activeOrg.aiStack} />
    </div>
  );
}

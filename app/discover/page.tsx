import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { readinessScore } from "@/lib/ai/schemas/discovery";
import { functionLabel } from "@/lib/discover/model";
import { listOwnDiscoveries } from "@/lib/discover/server";

export const metadata: Metadata = { title: "Your discoveries" };

const STAGE = { challenge: "Choosing a challenge", cards: "Drawing the cards", results: "Workflow ready" } as const;

export default async function DiscoveriesPage() {
  const list = await listOwnDiscoveries();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-4xl font-bold">Your discoveries</h1>
          <p className="text-ink-700">Saved in this browser. Add your email on any finished discovery to keep them everywhere.</p>
        </div>
        <Link href="/discover/new" className={buttonClasses("primary")}>
          Start a discovery
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cream-300 p-8 text-center text-ink-700">Nothing here yet. Start your first discovery: it takes about 15 minutes.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <li key={d.id}>
              <Link href={`/discover/${d.id}`} className="block h-full space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card transition-transform hover:-translate-y-0.5">
                <p className="text-xs font-bold tracking-wide text-green-700 uppercase">
                  {functionLabel(d.function_slug)} · {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
                <h2 className="font-display text-xl font-bold">{d.design.name || d.challenge?.title || "New discovery"}</h2>
                <p className="text-sm text-ink-700">
                  {STAGE[d.stage]}
                  {d.strengthened ? ` · Readiness ${readinessScore(d.strengthened.readiness)}/100` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

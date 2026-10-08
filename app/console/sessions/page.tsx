import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { PHASE_LABELS, type Phase } from "@/lib/session/machine";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const ctx = await requireFacilitator();
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, phase, created_at, decks (name), teams (count)")
    .eq("mode", "live")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Sessions</h1>
          <p className="text-ink-500">Run a live game: teams join on their phones with a code.</p>
        </div>
        {ctx.activeOrg && (
          <Link href="/console/sessions/new" className={buttonClasses("primary")}>
            New session
          </Link>
        )}
      </div>

      {!sessions?.length ? (
        <Card className="space-y-2 text-center">
          <p className="font-display text-lg font-bold">No sessions yet</p>
          <p className="text-ink-500">Create one from any deck. It stays a free draft until you open the lobby.</p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {sessions.map((s) => {
            const phase = s.phase as Phase;
            const live = !["draft", "closed"].includes(phase);
            return (
              <li key={s.id}>
                <Link
                  href={`/console/sessions/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <div className="space-y-0.5">
                    <p className="font-display text-lg font-bold">{s.name}</p>
                    <p className="text-sm text-ink-500">
                      {s.decks?.name ?? "No deck"} · {s.teams[0]?.count ?? 0} teams · {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      live ? "bg-green-600 text-cream-50" : phase === "draft" ? "bg-cream-200 text-ink-700" : "bg-cream-200 text-ink-500"
                    }`}
                  >
                    {live ? `Live · ${PHASE_LABELS[phase].title}` : PHASE_LABELS[phase].title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

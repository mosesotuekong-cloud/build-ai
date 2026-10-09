import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { DEMO_REPORT_PREFIX, DEMO_ROOM_PREFIX } from "@/lib/demo/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { PracticeButton } from "./practice-button";

export const metadata: Metadata = { title: "Demo tour" };

const PRACTICE_CASE = "The month-end HR report scramble";

function hoursUntil(iso: string | null) {
  return iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000)) : 0;
}

// The demo's home: three stops, each one click away.
export default async function DemoTourPage() {
  const ctx = await requireFacilitator();
  if (!ctx.isDemo || !ctx.activeOrg) redirect("/console");
  const orgId = ctx.activeOrg.orgId;
  const admin = createAdminClient();

  const [{ data: sessions }, { data: cases }, { data: org }] = await Promise.all([
    admin.from("sessions").select("id, name, phase").eq("org_id", orgId).eq("mode", "live"),
    admin.from("cases").select("id, title, decks!inner (org_id)").eq("decks.org_id", orgId).order("position"),
    admin.from("organizations").select("demo_ai_units, demo_expires_at").eq("id", orgId).single(),
  ]);
  const room = sessions?.find((s) => s.name.startsWith(DEMO_ROOM_PREFIX));
  const report = sessions?.find((s) => s.name.startsWith(DEMO_REPORT_PREFIX));
  const { data: myTeam } = room
    ? await admin.from("players").select("team_id").eq("session_id", room.id).eq("user_id", ctx.userId).maybeSingle()
    : { data: null };
  const practiceCase = cases?.find((c) => c.title === PRACTICE_CASE) ?? cases?.[0];
  const hoursLeft = hoursUntil(org?.demo_expires_at ?? null);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">Your demo sandbox</p>
        <h1 className="font-display text-4xl font-bold">Three stops, ten minutes.</h1>
        <p className="max-w-2xl text-lg text-ink-700">
          Everything here is yours alone and disappears in about {hoursLeft} hours. Live AI turns left: <strong>{org?.demo_ai_units ?? 0}</strong>. After
          that, the coach and judges switch to scripted replies.
        </p>
      </div>

      <ol className="grid gap-5 lg:grid-cols-3">
        <Stop n={1} title="Play a case" text="Design an automation on the real canvas with the AI coach, then finish to see your score, a model answer and a starter n8n workflow.">
          {practiceCase && <PracticeButton caseId={practiceCase.id} label={`Play "${practiceCase.title.replace(/^The /, "")}"`} />}
          <Link href="/console/decks" className="text-sm font-semibold text-green-700 hover:underline">
            Or pick any case from the deck
          </Link>
        </Stop>

        <Stop
          n={2}
          title="Run a room"
          text="A live workshop with three bot teams who have already designed something. You run it from the console; open the big screen and your team's phone beside it."
        >
          {room ? (
            <>
              <Link href={`/console/sessions/${room.id}`} className={buttonClasses("primary")}>
                Open the facilitator console
              </Link>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <a href={`/present/${room.id}`} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">
                  Big screen ↗
                </a>
                {myTeam?.team_id && (
                  <a href={`/play/${myTeam.team_id}`} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">
                    Your team&apos;s phone ↗
                  </a>
                )}
              </div>
              <p className="text-xs text-ink-500">Tip: press the big green button to move to the next phase. Got a phone? Join with the code on the big screen.</p>
            </>
          ) : (
            <p className="text-sm text-ink-500">The demo room has been deleted.</p>
          )}
        </Stop>

        <Stop n={3} title="See the payoff" text="A finished opportunity map from a sample workshop: what to automate first, the team's view beside the AI's, commitments and the before-and-after.">
          {report ? (
            <Link href={`/console/sessions/${report.id}/report`} className={buttonClasses("primary")}>
              Open the opportunity map
            </Link>
          ) : (
            <p className="text-sm text-ink-500">The sample report has been deleted.</p>
          )}
        </Stop>
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-green-600 p-6 text-cream-50">
        <p className="font-display text-xl font-bold">Ready to run it with your own team?</p>
        <Link href="/login" className={buttonClasses("primary", "bg-amber-400 text-ink-900 hover:bg-amber-300")}>
          Sign up
        </Link>
      </div>
    </div>
  );
}

function Stop({ n, title, text, children }: { n: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-display text-lg font-bold text-cream-50">{n}</span>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="flex-1 text-ink-700">{text}</p>
      <div className="flex flex-col items-start gap-2">{children}</div>
    </li>
  );
}

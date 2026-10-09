import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report/report-view";
import { RefreshWhile } from "@/components/session/refresh-while";
import { buttonClasses } from "@/components/ui/button";
import { reportProseSchema } from "@/lib/ai/schemas/report";
import { requireFacilitator } from "@/lib/auth/facilitator";
import type { OpportunityMap } from "@/lib/report/map";
import { createClient } from "@/lib/supabase/server";
import { RegenerateButton } from "./regenerate-button";

export const metadata: Metadata = { title: "Opportunity map" };

const REPORT_PHASES = new Set(["report", "closed"]);

export default async function ReportPage({ params }: PageProps<"/console/sessions/[sessionId]/report">) {
  const { sessionId } = await params;
  await requireFacilitator();
  const supabase = await createClient();
  const { data: session } = await supabase.from("sessions").select("id, name, phase, mode").eq("id", sessionId).maybeSingle();
  if (!session || session.mode !== "live") notFound();
  const { data: report } = await supabase.from("reports").select("status, map, prose, prose_source, generated_at").eq("session_id", session.id).maybeSingle();

  const prose = reportProseSchema.safeParse(report?.prose);
  const ready = report?.status === "done" && report.map && prose.success;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <RefreshWhile waiting={report?.status === "pending"} everyMs={3000} />
      <nav className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/console/sessions/${session.id}`} className="font-semibold text-green-700 hover:underline">
          ← Back to the session
        </Link>
        {ready && (
          <div className="flex flex-wrap items-center gap-2">
            <RegenerateButton sessionId={session.id} />
            <a href={`/api/report/${session.id}/pdf`} className={buttonClasses("primary")} download>
              Download PDF
            </a>
          </div>
        )}
      </nav>

      {ready ? (
        <>
          <ReportView map={report.map as unknown as OpportunityMap} prose={prose.data} />
          <p className="text-center text-xs text-ink-500 print:hidden">
            Written {new Date(report.generated_at!).toLocaleString("en-GB")}
            {report.prose_source === "template" && " from the session's numbers (the AI writer was unavailable)"}. Numbers come from the session; the AI wrote
            the words.
          </p>
        </>
      ) : report?.status === "pending" ? (
        <p className="rounded-2xl bg-cream-200/60 p-6 text-center text-lg text-ink-700" role="status">
          Writing your opportunity map… this takes about a minute.
        </p>
      ) : !REPORT_PHASES.has(session.phase) && !report ? (
        <p className="rounded-2xl bg-cream-200/60 p-6 text-center text-ink-700">The opportunity map is written when the session reaches the report.</p>
      ) : (
        <div className="space-y-3 rounded-2xl bg-cream-200/60 p-6 text-center">
          <p className="text-ink-700">{report?.status === "failed" ? "We couldn't write the report this time." : "There's no report for this session yet."}</p>
          <RegenerateButton sessionId={session.id} label="Write the report" />
        </div>
      )}
    </main>
  );
}

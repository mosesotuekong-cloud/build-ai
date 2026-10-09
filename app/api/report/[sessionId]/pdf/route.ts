import { z } from "zod";
import { reportProseSchema } from "@/lib/ai/schemas/report";
import { fileSlug } from "@/lib/export/guide";
import type { OpportunityMap } from "@/lib/report/map";
import { renderReportPdf } from "@/lib/report/pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Renders the opportunity map as a PDF for the session's staff. Each export
// is kept in the private "reports" bucket and recorded in report_exports.
export async function GET(_request: Request, ctx: RouteContext<"/api/report/[sessionId]/pdf">) {
  const { sessionId } = await ctx.params;
  if (!z.uuid().safeParse(sessionId).success) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  // Row-level security: only the session's staff can read its report.
  const { data: report } = await supabase.from("reports").select("id, org_id, status, map, prose").eq("session_id", sessionId).maybeSingle();
  if (!auth.user || !report) return new Response("Not found", { status: 404 });
  const prose = reportProseSchema.safeParse(report.prose);
  if (report.status !== "done" || !report.map || !prose.success) return new Response("The report isn't ready yet.", { status: 409 });

  const map = report.map as unknown as OpportunityMap;
  const pdf = await renderReportPdf(map, prose.data);
  const name = `${fileSlug(map.session.name)}-opportunity-map.pdf`;

  const admin = createAdminClient();
  const path = `${report.org_id}/${sessionId}/${Date.now()}-${name}`;
  const { error } = await admin.storage.from("reports").upload(path, pdf, { contentType: "application/pdf" });
  if (error) console.error("Storing the PDF failed:", error.message);
  await admin.from("report_exports").insert({ report_id: report.id, format: "pdf", storage_path: error ? null : path, created_by: auth.user.id });

  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}

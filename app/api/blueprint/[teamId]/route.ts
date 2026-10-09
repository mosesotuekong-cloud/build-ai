import { z } from "zod";
import { getPlatform } from "@/lib/config/platforms";
import { buildGuideMarkdown, fileSlug } from "@/lib/export/guide";
import { n8nCompiler } from "@/lib/export/n8n/compile";
import { planSchema, validatePlan } from "@/lib/export/plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  format: z.enum(["status", "n8n", "plan", "guide"]),
  platform: z.string().max(40).optional(),
});

// Says whether a team's blueprint is ready (format=status), or downloads it
// as the neutral plan, a starter n8n workflow, or a build guide for one
// platform. Files are compiled from the stored plan
// on each request. Only the team's players and the session's staff can read
// the blueprint (row-level security does the check).
export async function GET(request: Request, ctx: RouteContext<"/api/blueprint/[teamId]">) {
  const { teamId } = await ctx.params;
  if (!z.uuid().safeParse(teamId).success) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) return new Response("Bad request", { status: 400 });

  const supabase = await createClient();
  const { data: blueprint } = await supabase.from("blueprints").select("plan, status, design_version, session_id").eq("team_id", teamId).maybeSingle();
  if (query.data.format === "status") {
    return Response.json({ status: blueprint?.status ?? "none" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!blueprint) return new Response("Not found", { status: 404 });
  const parsed = planSchema.safeParse(blueprint.plan);
  if (blueprint.status !== "done" || !parsed.success || validatePlan(parsed.data).length) {
    return new Response("Your blueprint isn't ready yet.", { status: 409 });
  }
  const plan = parsed.data;
  const slug = fileSlug(plan.name);

  if (query.data.format === "plan") {
    return file(JSON.stringify({ builda_blueprint: 1, ...plan }, null, 2), `${slug}-blueprint.json`, "application/json");
  }
  if (query.data.format === "n8n") {
    return file(n8nCompiler.compile(plan), `${slug}-n8n-starter.json`, n8nCompiler.mimeType);
  }

  const platform = getPlatform(query.data.platform ?? "n8n");
  if (!platform) return new Response("Unknown platform", { status: 400 });
  const admin = createAdminClient();
  const { data: design } = await admin
    .from("designs")
    .select("trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems")
    .eq("team_id", teamId)
    .eq("version", blueprint.design_version)
    .single();
  if (!design) return new Response("Not found", { status: 404 });
  const markdown = buildGuideMarkdown({
    design: { ...design, hours_saved_per_month: design.hours_saved_per_month === null ? null : Number(design.hours_saved_per_month) },
    plan,
    platform,
  });
  return file(markdown, `${slug}-${platform.slug}-build-guide.md`, "text/markdown; charset=utf-8");
}

function file(body: string, name: string, type: string) {
  return new Response(body, {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}

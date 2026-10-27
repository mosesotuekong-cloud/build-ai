import { getPlatform } from "@/lib/config/platforms";
import { coachDesign } from "@/lib/discover/model";
import { renderDiscoveryPdf } from "@/lib/discover/pdf";
import { recordEvent } from "@/lib/discover/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnDiscovery } from "@/lib/discover/server";
import { buildGuideMarkdown, fileSlug } from "@/lib/export/guide";
import { compileN8n } from "@/lib/export/n8n/compile";
import { mcpServer, mcpToolSpec, workflowAsTool } from "@/lib/export/n8n/mcp";
import { copilotAgentPackage } from "@/lib/export/copilot/agent";
import { databricksBundle } from "@/lib/export/databricks/bundle";
import { fabricPackage } from "@/lib/export/fabric/package";
import { getPackage, type PackageKey } from "@/lib/export/packages";
import { powerAutomatePackage } from "@/lib/export/power-automate/compile";

export const runtime = "nodejs";

// Downloads for one discovery, only for the person who made it:
//   pdf            the workflow PDF
//   n8n            the n8n starter workflow
//   mcp-workflow   the n8n workflow, callable as a tool
//   mcp-server     the n8n MCP server that exposes it
//   mcp-tool       the MCP tool definition, for any stack
//   guide-<slug>   a build guide for one platform in their stack
//   power-automate, copilot-agent, databricks, fabric
//                  starter packages (zip) for those stacks
export async function GET(_request: Request, ctx: RouteContext<"/api/discover/[id]/[file]">) {
  const { id, file } = await ctx.params;
  const own = await getOwnDiscovery(id);
  if (!own) return new Response("Not found", { status: 404 });
  const d = own.discovery;
  const pkg = getPackage(file);
  if (pkg && !pkg.platforms.some((s) => d.stack.includes(s))) return new Response("Not found", { status: 404 });
  const known = ["pdf", "n8n", "mcp-workflow", "mcp-server", "mcp-tool"].includes(file) || file.startsWith("guide-") || Boolean(pkg);
  if (known) {
    await recordEvent(d.id, { kind: "downloaded", data: { file: file.startsWith("guide-") ? "guide" : file } });
    if (!d.game.downloaded) await createAdminClient().from("discoveries").update({ game: { ...d.game, downloaded: true } }).eq("id", d.id);
  }
  const plan = d.plan;
  const slug = fileSlug(plan?.name || d.design.name || d.challenge?.title || "automation");
  const json = (body: unknown, name: string) =>
    new Response(JSON.stringify(body, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
    });

  if (file === "pdf") {
    const pdf = await renderDiscoveryPdf(d);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${slug}-ai-discovery.pdf"`, "Cache-Control": "private, no-store" },
    });
  }
  if (!plan) return new Response("Build the workflow first.", { status: 409 });

  try {
    if (file === "n8n") return json(compileN8n(plan), `${slug}-n8n.json`);
    if (file === "mcp-workflow") return json(workflowAsTool(plan), `${slug}-n8n-callable-as-tool.json`);
    if (file === "mcp-server") return json(mcpServer(plan), `${slug}-n8n-mcp-server.json`);
    if (file === "mcp-tool") {
      return json(mcpToolSpec(plan, d.stack.map((s) => getPlatform(s)?.name ?? s)), `${slug}-mcp-tool.json`);
    }
    if (pkg) {
      const builders: Record<PackageKey, () => Buffer> = {
        "power-automate": () => powerAutomatePackage(plan),
        "copilot-agent": () => copilotAgentPackage({ plan, design: coachDesign(d), challenge: d.challenge?.title ?? null }),
        databricks: () => databricksBundle(plan),
        fabric: () => fabricPackage(plan),
      };
      return new Response(new Uint8Array(builders[pkg.key]()), {
        headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${slug}-${pkg.key}.zip"`, "Cache-Control": "private, no-store" },
      });
    }
    if (file.startsWith("guide-")) {
      const platform = getPlatform(file.slice("guide-".length));
      if (!platform || !d.stack.includes(platform.slug)) return new Response("Not found", { status: 404 });
      const md = buildGuideMarkdown({ design: coachDesign(d), plan, platform });
      return new Response(md, {
        headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-${platform.slug}-build-guide.md"`, "Cache-Control": "private, no-store" },
      });
    }
  } catch (error) {
    console.error(`Discovery export ${file} failed:`, error instanceof Error ? error.message : error);
    return new Response("That file couldn't be made. Try rebuilding the workflow.", { status: 500 });
  }
  return new Response("Not found", { status: 404 });
}

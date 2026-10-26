import { z } from "zod";
import { assistantContext, assistantSystem } from "@/lib/ai/prompts/assistant";
import { readinessScore } from "@/lib/ai/schemas/discovery";
import { planText, situationText, stripGlitches } from "@/lib/ai/tasks/discovery";
import { AI_ACT_LABELS } from "@/lib/discover/ai-act";
import { paybackText } from "@/lib/discover/business";
import { aiActOf, businessOf, verdictOf } from "@/lib/discover/insights";
import { buildaKnowledge } from "@/lib/discover/knowledge";
import { CARDS, regionOf, type ChatTurn, type Discovery } from "@/lib/discover/model";
import { money } from "@/lib/discover/regions";
import { scoreOf } from "@/lib/discover/score";
import { aiForDiscovery, getOwnDiscovery } from "@/lib/discover/server";
import { getTwist } from "@/lib/discover/twists";
import { VERDICTS } from "@/lib/discover/verdict";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
  card: z.number().int().min(0).max(CARDS.length - 1).nullable().default(null),
});

const MAX_TURNS = 40;

// What the chat knows about this discovery beyond the cards: the verdict,
// the business case, the AI Act check, readiness, the twist and the score.
function insights(d: Discovery): string {
  const lines: string[] = [];
  if (d.plan) {
    const { verdict, reasons } = verdictOf(d);
    const biz = businessOf(d);
    const likely = biz.result.scenarios[1];
    const c = regionOf(d).currency;
    const act = aiActOf(d);
    lines.push(
      "",
      "THE WORKFLOW BUILT FROM IT",
      planText(d.plan),
      "",
      `Verdict: ${verdict ? VERDICTS[verdict].title : "not rated yet"}. ${reasons.join(" ")}`,
      `Business case (${biz.inputs.source === "edited" ? "their numbers" : biz.inputs.source === "ai" ? "AI estimates" : "starting values"}): ${biz.inputs.cases_per_month} cases a month × ${biz.inputs.minutes_per_case} minutes, ${Math.round(biz.inputs.automatable_share * 100)}% automated, ${money(biz.inputs.hourly_rate, c)} an hour, build ${biz.inputs.build_days} days × ${money(biz.inputs.build_day_rate, c)}, running ${money(biz.inputs.running_cost_per_month, c)} a month. Likely: ${Math.round(likely.hoursSavedPerMonth)} hours saved a month, ${money(likely.netPerMonth, c)} net a month, payback ${paybackText(likely.paybackMonths)}.`,
      `EU AI Act (${act.source === "ai" ? "AI assessment" : "first read from their words"}): ${AI_ACT_LABELS[act.category].title}. ${act.reason}`,
    );
  }
  if (d.strengthened) lines.push(`Readiness after Make it stronger: ${readinessScore(d.strengthened.readiness)}/100. ${d.strengthened.summary}`);
  const twist = d.game.twist ? getTwist(d.game.twist.key) : null;
  if (twist) lines.push(`Twist drawn: ${twist.title}: ${twist.text} Their answer: ${d.game.twist?.response || "(not answered yet)"}`);
  const score = scoreOf(d);
  lines.push(`Discovery score: ${score.points}/${score.max} (${score.level}). Badges earned: ${score.badges.filter((b) => b.earned).map((b) => b.title).join(", ") || "none yet"}. Still to earn: ${score.badges.filter((b) => !b.earned).map((b) => b.title).join(", ")}.`);
  return lines.join("\n");
}

// Ask Builda: one chat turn, streamed back as plain text. The conversation
// is saved on the discovery (the last 40 messages).
export async function POST(request: Request, ctx: RouteContext<"/api/discover/[id]/chat">) {
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please type a question (up to 1,000 characters)." }, { status: 400 });
  const own = await getOwnDiscovery(id);
  if (!own) return Response.json({ error: "We can't find that discovery." }, { status: 404 });
  const d = own.discovery;

  const stage = d.stage === "results" ? "looking at their results" : d.stage === "cards" ? "drawing the cards" : "choosing a challenge";
  const card = d.stage === "cards" && parsed.data.card !== null ? CARDS[parsed.data.card].title : null;
  const system = `${assistantSystem(buildaKnowledge())}\n\n${assistantContext({ stage, card, situation: d.challenge ? situationText(d) : "They haven't chosen a challenge yet.", insights: insights(d) })}`;
  const history: ChatTurn[] = d.chat.slice(-20);
  const { provider } = await aiForDiscovery(id, 1);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let answer = "";
      try {
        for await (const chunk of provider.streamText({
          task: "discovery-chat",
          model: "discovery",
          system,
          messages: [...history, { role: "user", content: parsed.data.message }],
          maxTokens: 900,
        })) {
          answer += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("Ask Builda failed:", error instanceof Error ? error.message : error);
        const sorry = answer ? "" : "Sorry, I couldn't answer that just now. Please try again in a moment.";
        answer += sorry;
        if (sorry) controller.enqueue(encoder.encode(sorry));
      }
      const chat = [...d.chat, { role: "user" as const, content: parsed.data.message }, { role: "assistant" as const, content: stripGlitches(answer).slice(0, 4000) }].slice(-MAX_TURNS);
      await createAdminClient().from("discoveries").update({ chat }).eq("id", id);
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

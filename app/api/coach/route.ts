import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { COACH_COSTS, coachRequestSchema } from "@/lib/ai/schemas/coach";
import { runCoachTurn } from "@/lib/coach/engine";
import { loadCoachHistory, loadPlayerTeam } from "@/lib/play/load";
import { readSettings } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  teamId: z.uuid(),
  request: coachRequestSchema,
  message: z.string().max(500).default(""),
});

const COACHING_PHASES = new Set(["solving", "twist", "solving_after_twist"]);

// One coach turn, streamed back as newline-delimited JSON:
//   {"event":"meta", type, slot, tokens}   then
//   {"event":"text", text}                  repeated, then
//   {"event":"done", id}
// The reply is fully generated and leak-checked before anything is sent, so
// players never see text that later gets withdrawn. Tokens are spent here,
// on the server, before the AI runs, and refunded if the coach falls back.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { teamId, request: kind, message } = parsed.data;

  const data = await loadPlayerTeam(teamId);
  if (!data) return Response.json({ error: "You're not on this team." }, { status: 403 });
  if (!COACHING_PHASES.has(data.session.phase)) return Response.json({ error: "The coach is resting during this phase." }, { status: 409 });
  if (!data.case) return Response.json({ error: "Your team hasn't picked a case yet." }, { status: 409 });

  const admin = createAdminClient();
  const { data: sessionRow } = await admin.from("sessions").select("settings").eq("id", data.session.id).single();
  if (!readSettings(sessionRow?.settings).coach_enabled) return Response.json({ error: "The coach is switched off for this session." }, { status: 409 });
  const history = await loadCoachHistory(teamId);
  // One coach turn at a time per team: if the last message is the team's and
  // is recent, a reply is still being written (perhaps for a teammate).
  const last = history.at(-1);
  if (last?.role === "team" && Date.now() - new Date(last.created_at).getTime() < 60_000) {
    return Response.json({ error: "One moment, the coach is still answering your team." }, { status: 429 });
  }

  const cost = COACH_COSTS[kind];
  let tokens = data.team.hint_tokens_remaining;
  if (cost > 0) {
    const { data: remaining } = await admin.rpc("spend_hint_tokens", { target_team: teamId, amount: cost });
    if (remaining === null || remaining < 0) return Response.json({ error: "You're out of hint coins. Plain questions are still free." }, { status: 402 });
    tokens = remaining;
  }

  const askedText = message.trim() || (kind === "question" ? "Can you give us a question to think about?" : kind === "nudge" ? "We'd like a nudge." : "We'd like an analogy.");
  await admin.from("coach_messages").insert({ team_id: teamId, role: "team", content: askedText, player_id: data.playerId, trigger: "asked" });

  const result = await runCoachTurn(
    getAIProvider(),
    { case: data.case, design: data.design, phase: data.session.phase, twist: data.twist?.content ?? null, platforms: data.session.target_platforms, history },
    kind,
    askedText,
  );

  let spent = cost;
  if (result.source === "fallback" && cost > 0) {
    const { data: refunded } = await admin.rpc("add_hint_tokens", { target_team: teamId, amount: cost });
    if (typeof refunded === "number") tokens = refunded;
    spent = 0;
  }

  const { data: saved } = await admin
    .from("coach_messages")
    .insert({ team_id: teamId, role: "coach", type: result.reply.type, slot: result.reply.slot, content: result.reply.text, tokens_spent: spent, trigger: "asked" })
    .select("id")
    .single();

  const encoder = new TextEncoder();
  const words = result.reply.text.match(/\S+\s*/g) ?? [result.reply.text];
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      send({ event: "meta", type: result.reply.type, slot: result.reply.slot, tokens, refunded: cost > 0 && spent === 0 });
      for (const word of words) {
        send({ event: "text", text: word });
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      send({ event: "done", id: saved?.id ?? null });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

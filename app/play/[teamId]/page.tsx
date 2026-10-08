import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/wordmark";
import type { ReferenceSolution, ScoredCriterion } from "@/lib/ai/schemas/judge";
import { loadCoachHistory, loadPlayerTeam } from "@/lib/play/load";
import { PLATFORMS, platformNames } from "@/lib/config/platforms";
import { COMMON_SYSTEMS, mergeSuggestions } from "@/lib/config/systems";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PlayBoard } from "./play-board";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage({ params }: PageProps<"/play/[teamId]">) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/play/${teamId}`);

  const data = await loadPlayerTeam(teamId);
  if (!data || !data.case) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="max-w-md space-y-3 text-center">
          <Wordmark size="sm" />
          <p className="text-ink-700">This game isn&apos;t yours, or it has ended.</p>
          <Link href="/console/decks" className="font-semibold text-green-700 hover:underline">
            Back to decks
          </Link>
        </Card>
      </main>
    );
  }

  const history = await loadCoachHistory(teamId);
  const { data: deck } = data.session.deck_id
    ? await createAdminClient().from("decks").select("tools").eq("id", data.session.deck_id).maybeSingle()
    : { data: null };
  const toolSuggestions = mergeSuggestions(platformNames(data.session.target_platforms), PLATFORMS.map((p) => p.name));
  const systemSuggestions = mergeSuggestions(deck?.tools ?? [], COMMON_SYSTEMS);
  let finished: { score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null; reference: ReferenceSolution | null } | null = null;
  if (data.session.phase === "reveal") {
    const admin = createAdminClient();
    const [{ data: score }, { data: reference }] = await Promise.all([
      admin.from("scores").select("total, breakdown, ai_summary").eq("team_id", teamId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("reference_solutions").select("trigger, steps, decision, action, human, explanation").eq("case_id", data.caseId!).maybeSingle(),
    ]);
    finished = {
      score: score ? { total: score.total, breakdown: score.breakdown as ScoredCriterion[], summary: score.ai_summary } : null,
      reference: reference ?? null,
    };
  }

  return (
    <PlayBoard
      teamId={teamId}
      mode={data.session.mode}
      caseInfo={data.case}
      initialDesign={data.design}
      initialTokens={data.team.hint_tokens_remaining}
      platforms={data.session.target_platforms}
      history={history.map((m) => ({ id: m.id, role: m.role, type: m.type, slot: m.slot, content: m.content }))}
      initialFinished={finished}
      toolSuggestions={toolSuggestions}
      systemSuggestions={systemSuggestions}
    />
  );
}

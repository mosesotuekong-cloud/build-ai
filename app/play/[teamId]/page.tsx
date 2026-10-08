import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HoldingView } from "@/components/play/holding-view";
import { LobbyView } from "@/components/play/lobby-view";
import { LiveRefresh } from "@/components/session/live-refresh";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/wordmark";
import type { ReferenceSolution, ScoredCriterion } from "@/lib/ai/schemas/judge";
import { PLATFORMS, platformNames } from "@/lib/config/platforms";
import { COMMON_SYSTEMS, mergeSuggestions } from "@/lib/config/systems";
import { loadCoachHistory, loadPlayerTeam } from "@/lib/play/load";
import { DESIGN_PHASES, PHASE_LABELS, type Phase } from "@/lib/session/machine";
import { readSettings } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PlayBoard } from "./play-board";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage({ params }: PageProps<"/play/[teamId]">) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/join");

  const data = await loadPlayerTeam(teamId);
  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="max-w-md space-y-3 text-center">
          <Wordmark size="sm" />
          <p className="text-ink-700">This game isn&apos;t yours, or it has ended.</p>
          <Link href="/join" className="font-semibold text-green-700 hover:underline">
            Join a game
          </Link>
        </Card>
      </main>
    );
  }

  const admin = createAdminClient();
  const phase = data.session.phase as Phase;
  const settings = readSettings(data.session.settings);
  const timer = { startedAt: data.session.phase_started_at, duration: data.session.phase_duration_seconds, serverNow: new Date().toISOString() };
  const live = data.session.mode === "live";
  const refresher = live ? <LiveRefresh sessionId={data.session.id} teamIds={[teamId]} watch={["sessions", "teams", "players"]} scope="team" /> : null;

  // Lobby: pick a case and see who's here.
  if (live && ["lobby", "baseline_check"].includes(phase)) {
    const [{ data: cases }, { data: teams }, { data: players }] = await Promise.all([
      admin.from("cases").select("id, title, story, cost, who_feels_it, function_slug").eq("deck_id", data.session.deck_id!).order("position"),
      admin.from("teams").select("name, case_id").eq("session_id", data.session.id),
      admin.from("players").select("display_name").eq("team_id", teamId).is("left_at", null).order("joined_at"),
    ]);
    return (
      <>
        {refresher}
        <LobbyView
          teamId={teamId}
          teamName={data.team.name}
          teammates={(players ?? []).map((p) => p.display_name)}
          phaseMessage={phase === "baseline_check" ? "The warm-up round arrives in a later update. Your facilitator will move on shortly." : PHASE_LABELS.lobby.player}
          canPick={settings.case_mode === "teams_pick"}
          pickByFunction={settings.function_mode === "pick_function"}
          cases={(cases ?? []).map((c) => ({ ...c, takenBy: (teams ?? []).filter((t) => t.case_id === c.id).map((t) => t.name) }))}
          pickedId={data.caseId}
          timer={timer}
        />
      </>
    );
  }

  // Design phases (and the twist moment): the canvas.
  const canvasPhase = DESIGN_PHASES.has(phase) || phase === "twist" || (!live && phase === "reveal");
  if (!canvasPhase || !data.case) {
    return (
      <>
        {refresher}
        <HoldingView title={PHASE_LABELS[phase].title} message={PHASE_LABELS[phase].player} teamName={data.team.name} timer={timer} />
      </>
    );
  }

  const history = await loadCoachHistory(teamId);
  const { data: deck } = data.session.deck_id ? await admin.from("decks").select("tools").eq("id", data.session.deck_id).maybeSingle() : { data: null };
  const toolSuggestions = mergeSuggestions(platformNames(data.session.target_platforms), PLATFORMS.map((p) => p.name));
  const systemSuggestions = mergeSuggestions(deck?.tools ?? [], COMMON_SYSTEMS);

  let finished: { score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null; reference: ReferenceSolution | null } | null = null;
  if (!live && phase === "reveal") {
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
    <>
      {refresher}
      <PlayBoard
        teamId={teamId}
        mode={data.session.mode}
        phase={phase}
        teamName={data.team.name}
        timer={timer}
        coachEnabled={settings.coach_enabled}
        caseInfo={data.case}
        initialDesign={data.design}
        initialTokens={data.team.hint_tokens_remaining}
        platforms={data.session.target_platforms}
        history={history.map((m) => ({ id: m.id, role: m.role, type: m.type, slot: m.slot, content: m.content }))}
        initialFinished={finished}
        toolSuggestions={toolSuggestions}
        systemSuggestions={systemSuggestions}
      />
    </>
  );
}

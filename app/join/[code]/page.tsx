import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findOpenSession } from "../actions";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join a game" };

export default async function JoinCodePage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const session = await findOpenSession(code);
  if (!session) redirect("/join?error=code");

  // Already on a team in this session? Go straight back to it.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (auth.user) {
    const { data: player } = await admin.from("players").select("team_id").eq("session_id", session.id).eq("user_id", auth.user.id).is("left_at", null).maybeSingle();
    if (player?.team_id) redirect(`/play/${player.team_id}`);
  }

  const { data: teams } = await admin.from("teams").select("id, name, players (count)").eq("session_id", session.id).order("created_at");

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <Wordmark size="sm" />
      <div className="w-full max-w-md space-y-1 text-center">
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">Joining</p>
        <h1 className="font-display text-3xl font-bold">{session.name}</h1>
      </div>
      <JoinForm code={session.code} teams={(teams ?? []).map((t) => ({ id: t.id, name: t.name, players: t.players[0]?.count ?? 0 }))} />
    </main>
  );
}

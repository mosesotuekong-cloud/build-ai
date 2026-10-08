"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { joinSession } from "../actions";

export function JoinForm({ code, teams }: { code: string; teams: { id: string; name: string; players: number }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState("");
  const [creating, setCreating] = useState(teams.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = name.trim() && (creating ? newTeam.trim() : teamId);

  const submit = () =>
    start(async () => {
      setError(null);
      // Players have no account: sign in anonymously the first time.
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          setError("We couldn't sign you in. Check your connection and try again.");
          return;
        }
      }
      const result = await joinSession({ code, displayName: name, ...(creating ? { newTeamName: newTeam } : { teamId: teamId! }) });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/play/${result.teamId}`);
    });

  const input =
    "w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-lg outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <form
      className="w-full max-w-md space-y-6 rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) submit();
      }}
    >
      <label className="block space-y-1.5">
        <span className="font-semibold text-ink-700">Your name</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" autoFocus />
        <span className="block text-sm text-ink-500">
          Your facilitator sees your name next to your results. Anything shared outside your organisation is anonymous, and your name
          is never sent to the AI.
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold text-ink-700">Your team</legend>
        {teams.map((t) => (
          <label
            key={t.id}
            className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 ${
              !creating && teamId === t.id ? "border-green-600 bg-green-50" : "border-cream-300 bg-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="team"
                checked={!creating && teamId === t.id}
                onChange={() => {
                  setCreating(false);
                  setTeamId(t.id);
                }}
                className="h-5 w-5 accent-green-600"
              />
              <span className="font-semibold">{t.name}</span>
            </span>
            <span className="text-sm text-ink-500">
              {t.players} {t.players === 1 ? "player" : "players"}
            </span>
          </label>
        ))}
        <label className={`block space-y-2 rounded-xl border-2 px-4 py-3 ${creating ? "border-green-600 bg-green-50" : "border-dashed border-cream-300 bg-white"}`}>
          <span className="flex items-center gap-3">
            <input type="radio" name="team" checked={creating} onChange={() => setCreating(true)} className="h-5 w-5 accent-green-600" />
            <span className="font-semibold">Start a new team</span>
          </span>
          {creating && (
            <input className={input} value={newTeam} onChange={(e) => setNewTeam(e.target.value)} maxLength={40} placeholder="Team name, e.g. The Fixers" aria-label="New team name" />
          )}
        </label>
      </fieldset>

      {error && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!ready || pending} className="w-full text-lg">
        {pending ? "Joining…" : "Join the game"}
      </Button>
    </form>
  );
}

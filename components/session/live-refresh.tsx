"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

type Watch = "sessions" | "teams" | "players" | "designs" | "coach_messages" | "ideas" | "checks";

// Listens for changes to a session and re-renders the page from the server.
// Realtime applies the same row-level security as normal reads, so each
// viewer only hears about rows they may see.
//
// Refreshing a page is expensive, so refreshes are batched: at most one per
// `throttleMs`. Phase changes always count, straight away.
//
// scope "session" (console, projector): every team and player change in the
//   session counts, including new teams; design and coach changes count for
//   the given `teamIds`.
// scope "team" (a phone): only changes to the given team count.
export function LiveRefresh({
  sessionId,
  teamIds = [],
  watch,
  throttleMs = 1500,
  scope = "session",
}: {
  sessionId: string;
  teamIds?: string[];
  watch: Watch[];
  throttleMs?: number;
  scope?: "session" | "team";
}) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamKey = teamIds.join(",");
  const watchKey = watch.join(",");

  useEffect(() => {
    const supabase = createClient();
    const teams = new Set(teamKey ? teamKey.split(",") : []);
    const watching = new Set(watchKey.split(",") as Watch[]);
    let cancelled = false;

    const refresh = () => {
      if (pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        router.refresh();
      }, throttleMs);
    };
    const refreshNow = () => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      router.refresh();
    };
    const mine = (teamId: string | undefined) => !teams.size || (teamId !== undefined && teams.has(teamId));
    const rowOf = (payload: { new: unknown; old: unknown }) =>
      ((payload.new && Object.keys(payload.new as object).length ? payload.new : payload.old) ?? {}) as { id?: string; team_id?: string };

    const channel = supabase.channel(`session-${sessionId}-${Math.random().toString(36).slice(2)}`);
    if (watching.has("sessions")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, refreshNow);
    }
    if (watching.has("ideas")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "ideas", filter: `session_id=eq.${sessionId}` }, refresh);
    }
    if (watching.has("checks")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "individual_checks", filter: `session_id=eq.${sessionId}` }, refresh);
    }
    if (watching.has("teams")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${sessionId}` }, (p) => {
        if (scope === "session" || mine(rowOf(p).id)) refresh();
      });
    }
    if (watching.has("players")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `session_id=eq.${sessionId}` }, (p) => {
        if (scope === "session" || mine(rowOf(p).team_id)) refresh();
      });
    }
    // Designs and coach messages have no session column; RLS limits what we
    // receive, and we only react to the teams we were given.
    for (const table of ["designs", "coach_messages"] as const) {
      if (watching.has(table)) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (p) => {
          if (mine(rowOf(p).team_id)) refresh();
        });
      }
    }

    // Realtime must connect as the signed-in viewer, or row-level security
    // (rightly) sends nothing. Load the session first, then subscribe.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });

    // Realtime can drop on flaky wifi; catch up when the tab comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, teamKey, watchKey, throttleMs, scope, router]);

  return null;
}

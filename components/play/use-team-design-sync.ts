"use client";

import { useEffect } from "react";
import type { CoachDesign } from "@/lib/coach/context";
import { createClient } from "@/lib/supabase/browser";

const FIELDS = ["trigger", "steps", "decision", "action", "human", "name", "hours_saved_per_month", "tools", "systems"] as const;

// Applies teammates' design edits as they arrive, straight from Realtime,
// without re-rendering the page on the server. `onRemote` receives the
// fresh row; the caller keeps any fields this phone is still saving.
export function useTeamDesignSync(teamId: string, version: "before_twist" | "after_twist", onRemote: (design: Partial<CoachDesign>) => void) {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const channel = supabase.channel(`design-${teamId}-${Math.random().toString(36).slice(2)}`).on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "designs", filter: `team_id=eq.${teamId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.version !== version) return;
        const design: Partial<CoachDesign> = {};
        for (const key of FIELDS) {
          if (key in row) (design as Record<string, unknown>)[key] = key === "hours_saved_per_month" && row[key] !== null ? Number(row[key]) : row[key];
        }
        onRemote(design);
      },
    );
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [teamId, version, onRemote]);
}

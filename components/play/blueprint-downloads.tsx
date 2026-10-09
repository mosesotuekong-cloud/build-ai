"use client";

import { useEffect, useState } from "react";
import type { Platform } from "@/lib/config/platforms";

type Status = "loading" | "none" | "pending" | "done" | "failed";

const POLL_MS = 3000;
const MAX_POLLS = 60;

// The take-home files: the starter n8n workflow, the tool-neutral blueprint,
// and a build guide per platform. The blueprint is written in the background
// at the reveal, so this waits for it.
export function BlueprintDownloads({ teamId, stack }: { teamId: string; stack: Platform[] }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/blueprint/${teamId}?format=status`, { cache: "no-store" });
        const body = (await res.json()) as { status: Status };
        if (stopped) return;
        setStatus(body.status);
        if (body.status === "done" || body.status === "failed") return;
      } catch {
        // Keep trying: the network on a workshop Wi-Fi can blink.
      }
      if (++polls < MAX_POLLS && !stopped) timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [teamId]);

  const href = (format: string, platform?: string) => `/api/blueprint/${teamId}?format=${format}${platform ? `&platform=${platform}` : ""}`;

  return (
    <section className="space-y-4" aria-labelledby="take-home">
      <div className="space-y-1">
        <h2 id="take-home" className="font-display text-2xl font-bold">
          Take it home
        </h2>
        <p className="text-ink-500">Your design as files you can build from.</p>
      </div>

      {status === "done" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={href("n8n")}
              download
              className="shadow-card flex flex-col rounded-2xl border-b-4 border-green-800 bg-green-600 p-4 text-cream-50 hover:bg-green-700"
            >
              <span className="font-display text-lg font-bold">Starter n8n workflow</span>
              <span className="text-sm opacity-90">A .json file to import into n8n</span>
            </a>
            <a href={href("plan")} download className="border-cream-300 bg-cream-50 shadow-card flex flex-col rounded-2xl border p-4 hover:border-green-400">
              <span className="font-display text-lg font-bold">Blueprint</span>
              <span className="text-ink-500 text-sm">The tool-neutral plan, as .json</span>
            </a>
          </div>
          <p className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm text-ink-700" role="note">
            <strong>This is a starter workflow, not a finished build.</strong> Connect your own accounts, replace every value marked REPLACE, and
            test it with made-up data before it touches real people.
          </p>
          <div className="flex flex-wrap gap-2">
            {stack.map((p) => (
              <a
                key={p.slug}
                href={href("guide", p.slug)}
                download
                className="border-cream-300 bg-cream-50 text-ink-700 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold hover:border-green-400"
              >
                Build guide: {p.name}
              </a>
            ))}
          </div>
        </div>
      ) : status === "failed" ? (
        <p className="text-ink-700">We couldn&apos;t prepare your files this time. Your facilitator can share your design from the report.</p>
      ) : status === "none" ? (
        <p className="text-ink-700">Your files appear here after the reveal.</p>
      ) : (
        <p className="bg-cream-200/60 text-ink-700 rounded-xl p-4" role="status">
          Preparing your blueprint and starter workflow…
        </p>
      )}
    </section>
  );
}

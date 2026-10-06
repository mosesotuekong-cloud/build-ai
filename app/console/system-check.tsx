"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { runSystemCheck, type SystemCheckResult } from "./actions";

export function SystemCheck() {
  const [result, setResult] = useState<SystemCheckResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">System check</h2>
          <p className="text-sm text-ink-500">
            Generates a sample Finance deck through the n8n client and AI provider, and checks the result.
          </p>
        </div>
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => setResult(await runSystemCheck()))}>
          {pending ? "Generating…" : "Generate sample deck"}
        </Button>
      </div>

      {result && !result.ok && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {result.message}
        </p>
      )}

      {result?.ok && (
        <div className="space-y-3">
          <p className="text-sm text-green-700">
            Six valid cases in {(result.ms / 1000).toFixed(1)}s via {result.mode === "local" ? "the local n8n fallback" : "n8n"}.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {result.cases.map((c) => (
              <li key={c.title} className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-4">
                <h3 className="font-display font-semibold">{c.title}</h3>
                <p className="text-sm text-ink-700">{c.story}</p>
                <p className="text-sm text-amber-700">{c.cost}</p>
                <p className="text-xs text-ink-500">Who feels it: {c.who_feels_it}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

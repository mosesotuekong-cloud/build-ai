"use client";

import { useState, useTransition } from "react";
import { saveFeedback } from "@/app/discover/actions";
import { Button } from "@/components/ui/button";

const SCALE = ["Not at all", "A little", "Somewhat", "Very", "Extremely"];

// "Was this useful?": one tap, an optional comment. Phase 1 uses the answers
// to judge whether the outputs help real teams.
export function FeedbackBox({ id, initial }: { id: string; initial: { useful: number; comment: string } | null }) {
  const [useful, setUseful] = useState<number | null>(initial?.useful ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [sent, setSent] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (value: number | null = useful) =>
    start(async () => {
      if (value === null) return;
      setError(null);
      const r = await saveFeedback(id, { useful: value, comment });
      if (!r.ok) return setError(r.error);
      setSent(true);
    });

  return (
    <section aria-labelledby="fb-h" className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-5">
      <h2 id="fb-h" className="font-display text-xl font-bold">
        Was this useful?
      </h2>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How useful was this discovery">
        {SCALE.map((label, i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={useful === i + 1}
            onClick={() => {
              setUseful(i + 1);
              setSent(false);
            }}
            className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold ${useful === i + 1 ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-white hover:border-green-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {useful !== null && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-ink-700">What would make it more useful? (optional)</span>
            <textarea
              value={comment}
              maxLength={1000}
              rows={2}
              onChange={(e) => {
                setComment(e.target.value);
                setSent(false);
              }}
              className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" disabled={pending || sent} onClick={() => send()}>
              {pending ? "Sending…" : sent ? "Thanks, sent" : "Send"}
            </Button>
            {error && (
              <span className="text-sm text-danger-700" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

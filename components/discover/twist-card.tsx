"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { answerTwist, drawTwist } from "@/app/discover/actions";
import { SPRINGS } from "@/components/game/springs";
import { Button } from "@/components/ui/button";
import { getTwist } from "@/lib/discover/twists";

// Stress test it: draw a twist card, then say what would change. Earns the
// Twist survivor badge.
export function TwistCard({ id, initial, onChange }: { id: string; initial: { key: string; response: string } | null; onChange: () => void }) {
  const [key, setKey] = useState<string | null>(initial?.key ?? null);
  const [response, setResponse] = useState(initial?.response ?? "");
  const [saved, setSaved] = useState(Boolean(initial?.response));
  const [error, setError] = useState<string | null>(null);
  const [drawing, startDrawing] = useTransition();
  const [saving, startSaving] = useTransition();
  const reduce = useReducedMotion();
  const twist = key ? getTwist(key) : null;

  const draw = () =>
    startDrawing(async () => {
      setError(null);
      const r = await drawTwist(id);
      if (!r.ok) return setError(r.error);
      setKey(r.key);
      setResponse("");
      setSaved(false);
    });

  return (
    <section aria-labelledby="twist-h" className="space-y-4 rounded-3xl border-2 border-amber-400 bg-amber-50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="twist-h" className="font-display text-2xl font-bold">
            🌪️ Stress test it
          </h2>
          <p className="text-ink-700">Real projects hit surprises. Draw a twist and say how your design would cope.</p>
        </div>
        <Button type="button" variant={twist ? "secondary" : "accent"} onClick={draw} disabled={drawing}>
          {drawing ? "Shuffling…" : twist ? "Draw another twist" : "Draw a twist card"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {twist && (
          <motion.div
            key={twist.key}
            className="grid gap-4 md:grid-cols-[16rem_1fr]"
            initial={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
            transition={SPRINGS.bouncy}
          >
            <div className="relative overflow-hidden rounded-2xl border-b-4 border-amber-500 bg-amber-400 p-4 text-ink-900 shadow-lift">
              <p className="text-xs font-bold tracking-[0.2em] uppercase">Twist</p>
              <p className="mt-1 font-display text-2xl font-bold">{twist.title}</p>
              <p className="mt-2 text-sm">{twist.text}</p>
            </div>
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="font-semibold">{twist.ask}</span>
                <textarea
                  value={response}
                  rows={3}
                  maxLength={800}
                  onChange={(e) => {
                    setResponse(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  disabled={saving || saved || !response.trim()}
                  onClick={() =>
                    startSaving(async () => {
                      setError(null);
                      const r = await answerTwist(id, response);
                      if (!r.ok) return setError(r.error);
                      setSaved(true);
                      onChange();
                    })
                  }
                >
                  {saving ? "Saving…" : saved ? "Saved ✓" : "Save our answer"}
                </Button>
                {error && (
                  <span className="text-sm text-danger-700" role="alert">
                    {error}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

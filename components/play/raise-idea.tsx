"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FREQUENCIES } from "@/lib/discovery/scorecard";
import { raiseIdea } from "@/app/play/discovery-actions";

// "Bring your own problem": a small button that opens a quick form for a
// problem from the player's own work. It goes into the business's backlog.
export function RaiseIdeaButton({ teamId, offsetForCoach = false }: { teamId: string; offsetForCoach?: boolean }) {
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-30 flex items-center gap-1.5 rounded-full border-2 border-amber-500 bg-amber-400 px-4 py-2.5 text-sm font-bold text-ink-900 shadow-lift ${
          offsetForCoach ? "bottom-20 right-4 lg:bottom-6" : "right-4 bottom-4"
        }`}
      >
        <span aria-hidden>+</span> Raise a problem
      </button>
      <AnimatePresence>
        {thanks && (
          <motion.p
            role="status"
            className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-2xl bg-green-600 p-4 text-center font-semibold text-cream-50 shadow-lift"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setThanks(false), 2500)}
          >
            Thanks! Your problem is on the business&apos;s list.
          </motion.p>
        )}
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-ink-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              className="mt-auto max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream-50 p-5 sm:m-auto sm:max-w-lg sm:rounded-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            >
              <IdeaForm
                onCancel={() => setOpen(false)}
                onSubmit={async (input) => {
                  const result = await raiseIdea(teamId, input);
                  if (result.ok) {
                    setOpen(false);
                    setThanks(true);
                  }
                  return result;
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function IdeaForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: { title: string; what_happens: string; who_feels_it: string; frequency: "daily" | "weekly" | "monthly" | "rarely" | null }) => Promise<{ ok: boolean; message?: string }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "rarely" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = "w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const result = await onSubmit({ title, what_happens: what, who_feels_it: who, frequency });
          if (!result.ok) setError(result.message ?? "That didn't work.");
        });
      }}
    >
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold">Raise a problem</h2>
        <p className="text-sm text-ink-500">Something in your own work that wastes time or goes wrong. It goes on the list the business takes away.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">Give it a short name</span>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Chasing signatures on paper" autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">What happens today?</span>
        <textarea className={`${input} min-h-24`} value={what} onChange={(e) => setWhat(e.target.value)} maxLength={600} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">Who feels it? (optional)</span>
        <input className={input} value={who} onChange={(e) => setWho(e.target.value)} maxLength={200} />
      </label>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold text-ink-700">How often? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={frequency === f.value}
              onClick={() => setFrequency(frequency === f.value ? null : f.value)}
              className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${frequency === f.value ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-white text-ink-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || title.trim().length < 3 || what.trim().length < 10}>
          {pending ? "Saving…" : "Add to the list"}
        </Button>
      </div>
    </form>
  );
}

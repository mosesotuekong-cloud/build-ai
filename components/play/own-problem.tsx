"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { designOwnProblem } from "@/app/play/discovery-actions";

// In the lobby: a dashed card that lets a team design its own problem instead
// of a deck case. It becomes a case for this session only.
export function OwnProblemCard({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[23rem] w-60 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center text-amber-700 shadow-socket transition-colors hover:bg-amber-100"
      >
        <span className="font-display text-4xl font-bold">+</span>
        <span className="font-bold">Our own problem</span>
        <span className="text-sm">Design something from your own work instead</span>
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-3xl border border-cream-300 bg-cream-50 p-0 shadow-lift backdrop:bg-ink-900/40">
        {open && <OwnProblemForm teamId={teamId} onDone={() => setOpen(false)} />}
      </dialog>
    </>
  );
}

function OwnProblemForm({ teamId, onDone }: { teamId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [who, setWho] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = "w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const result = await designOwnProblem(teamId, { title, story, who_feels_it: who, cost });
          if (result.ok) onDone();
          else setError(result.message ?? "That didn't work.");
        });
      }}
    >
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold">Our own problem</h2>
        <p className="text-sm text-ink-500">Describe what happens today. Don&apos;t solve it yet; that&apos;s the game.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">Short name</span>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">What happens today?</span>
        <textarea className={`${input} min-h-28`} value={story} onChange={(e) => setStory(e.target.value)} maxLength={900} placeholder="Who does what by hand, and one time it went wrong." />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">Who feels it?</span>
        <input className={input} value={who} onChange={(e) => setWho(e.target.value)} maxLength={200} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink-700">What does it cost? (optional)</span>
        <input className={input} value={cost} onChange={(e) => setCost(e.target.value)} maxLength={300} placeholder="Time, money or goodwill" />
      </label>
      {error && (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || title.trim().length < 3 || story.trim().length < 20}>
          {pending ? "Saving…" : "Design this one"}
        </Button>
      </div>
    </form>
  );
}

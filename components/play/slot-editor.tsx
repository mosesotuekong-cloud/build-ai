"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SLOT_LABELS, type CanvasSlot } from "@/lib/ai/schemas/canvas";

// Generic examples from other functions, so players see the shape of a good
// answer without being handed theirs.
const EXAMPLES: Record<CanvasSlot, string> = {
  trigger: "e.g. “A customer submits the refund form” or “It's the 25th of the month”.",
  steps: "e.g. “Look up the order in the sales sheet and pull the customer's history”.",
  decision: "e.g. a rule: “If the refund is under ₦20,000, approve” or AI: “Read the complaint and classify it”.",
  action: "e.g. “Send the customer a WhatsApp update and log it in the CRM”.",
  human: "e.g. “The finance lead approves every refund over ₦20,000”.",
};

export function SlotEditor({
  slot,
  value,
  onSave,
  onAskCoach,
  onClose,
  hideCoach = false,
}: {
  slot: CanvasSlot | null;
  value: string;
  onSave: (slot: CanvasSlot, value: string) => void;
  onAskCoach: (slot: CanvasSlot) => void;
  onClose: () => void;
  hideCoach?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (slot && !dialog.open) dialog.showModal();
    if (!slot && dialog.open) dialog.close();
  }, [slot]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto mb-0 w-full max-w-xl rounded-t-3xl border border-cream-300 bg-cream-50 p-0 shadow-lift backdrop:bg-ink-900/40 sm:mb-auto sm:rounded-3xl"
    >
      {slot && <EditorBody key={slot} slot={slot} initial={value} onSave={onSave} onAskCoach={hideCoach ? null : onAskCoach} onClose={onClose} />}
    </dialog>
  );
}

function EditorBody({
  slot,
  initial,
  onSave,
  onAskCoach,
  onClose,
}: {
  slot: CanvasSlot;
  initial: string;
  onSave: (slot: CanvasSlot, value: string) => void;
  onAskCoach: ((slot: CanvasSlot) => void) | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const isHuman = slot === "human";
  const { title, prompt } = SLOT_LABELS[slot];

  return (
    <form
      method="dialog"
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(slot, text.trim());
      }}
    >
      <div className="space-y-1">
        <p className={`text-xs font-bold tracking-wider uppercase ${isHuman ? "text-amber-700" : "text-green-700"}`}>{title}</p>
        <h2 className="font-display text-2xl font-bold">{prompt}</h2>
        <p className="text-sm text-ink-500">{EXAMPLES[slot]}</p>
      </div>
      <textarea
        autoFocus
        value={text}
        maxLength={600}
        rows={4}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        aria-label={title}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onAskCoach ? (
          <button type="button" onClick={() => onAskCoach(slot)} className="text-sm font-semibold text-green-700 hover:underline">
            Stuck? Ask the coach
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Snap it in</Button>
        </div>
      </div>
    </form>
  );
}

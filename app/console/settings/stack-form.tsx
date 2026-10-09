"use client";

import { useState, useTransition } from "react";
import { PlatformPicker } from "@/components/decks/platform-picker";
import { Button } from "@/components/ui/button";
import { saveAiStack } from "./actions";

export function StackForm({ orgId, initial, canEdit }: { orgId: string; initial: string[]; canEdit: boolean }) {
  const [selected, setSelected] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = [...selected].sort().join() !== [...initial].sort().join();

  return (
    <div className="space-y-5">
      <fieldset disabled={!canEdit} className="disabled:opacity-70">
        <PlatformPicker selected={selected} onChange={(next) => (setSelected(next), setMessage(null))} />
      </fieldset>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const result = await saveAiStack(orgId, selected);
                setMessage(result.message);
              })
            }
          >
            {pending ? "Saving…" : "Save stack"}
          </Button>
          <span className={`text-sm ${dirty && !message ? "font-semibold text-amber-700" : "text-ink-500"}`} role="status">
            {message ?? (dirty ? `${selected.length} selected. Not saved yet: press Save stack.` : `${selected.length} selected`)}
          </span>
        </div>
      ) : (
        <p className="text-sm text-ink-500">Only organisation admins can change the stack.</p>
      )}
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SPRINGS } from "@/components/game/springs";
import { COACH_COSTS, type CoachRequest } from "@/lib/ai/schemas/coach";

export type ChatMessage = { id: string; role: "team" | "coach"; type: string | null; slot: string | null; content: string };

const TYPE_LABEL: Record<string, string> = { question: "Question", nudge: "Nudge", analogy: "Analogy", flag: "Check" };
const SLOT_LABEL: Record<string, string> = {
  trigger: "Trigger",
  steps: "Steps",
  decision: "Decision",
  action: "Action",
  human: "Human in control",
  name: "Name",
  hours_saved: "Hours saved",
  tools: "Tools",
  systems: "Systems",
};

// The team's shared coach thread. Messages live in the parent so the desktop
// panel and the phone sheet always show the same conversation.
export function CoachPanel({
  teamId,
  messages,
  onMessages,
  disabled,
  tokens,
  onTokens,
  draft,
  onDraft,
  onClose,
}: {
  teamId: string;
  messages: ChatMessage[];
  onMessages: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  disabled: boolean;
  tokens: number;
  onTokens: (n: number) => void;
  draft: string;
  onDraft: (text: string) => void;
  onClose?: () => void;
}) {
  const text = draft;
  const setText = onDraft;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask(kind: CoachRequest) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = text.trim();
    const teamText = message || (kind === "question" ? "Can you give us a question to think about?" : kind === "nudge" ? "We'd like a nudge." : "We'd like an analogy.");
    const coachId = `coach-${Date.now()}`;
    const teamId_ = `team-${Date.now()}`;
    onMessages((prev) => [...prev, { id: teamId_, role: "team", type: null, slot: null, content: teamText }]);
    setText("");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId, request: kind, message }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "The coach couldn't answer just now. Try again in a moment.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.event === "meta") {
            onTokens(event.tokens);
            onMessages((prev) => [...prev, { id: coachId, role: "coach", type: event.type, slot: event.slot, content: "" }]);
          } else if (event.event === "text") {
            onMessages((prev) => prev.map((m) => (m.id === coachId ? { ...m, content: m.content + event.text } : m)));
          }
        }
      }
    } catch (e) {
      // Take back a message the coach never received, and restore the draft.
      onMessages((prev) => (prev.some((m) => m.id === coachId) ? prev : prev.filter((m) => m.id !== teamId_)));
      setText(message);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-card" aria-label="Coach">
      <header className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3">
        <div>
          <h2 className="font-display text-lg font-bold">Your coach</h2>
          <p className="text-xs text-ink-500">Asks questions. Never gives you the answer.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-cream-200">
            Close
          </button>
        )}
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="rounded-xl bg-cream-200/60 p-3 text-sm text-ink-700">
            Ask anything about your case. Plain questions are free. A <strong>nudge</strong> names a gap in your design, and an{" "}
            <strong>analogy</strong> shows how another team solved something similar. Each costs one coin.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={SPRINGS.snappy}
              className={m.role === "team" ? "ml-8 flex justify-end" : "mr-6"}
            >
              {m.role === "team" ? (
                <p className="rounded-2xl rounded-br-md bg-green-600 px-3.5 py-2 text-sm text-cream-50">{m.content}</p>
              ) : (
                <div className="space-y-1.5 rounded-2xl rounded-bl-md border border-cream-300 bg-white px-3.5 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {m.type && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${m.type === "question" ? "bg-green-50 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {TYPE_LABEL[m.type] ?? m.type}
                      </span>
                    )}
                    {m.type && (
                      <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-700 uppercase">
                        {m.slot && m.slot !== "general" ? (SLOT_LABEL[m.slot] ?? m.slot) : "General"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-ink-900">{m.content || <span className="text-ink-500">Thinking…</span>}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && !messages.some((m) => m.role === "coach" && m.content === "") && messages.at(-1)?.role === "team" && (
          <p className="mr-6 text-sm text-ink-500">The coach is thinking…</p>
        )}
      </div>

      <div className="space-y-2 border-t border-cream-200 p-3">
        {error && (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask("question");
            }
          }}
          rows={2}
          maxLength={500}
          disabled={disabled || busy}
          placeholder={disabled ? "The coach is resting." : "Ask the coach…"}
          className="w-full resize-none rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          aria-label="Message to the coach"
        />
        <div className="grid grid-cols-3 gap-2">
          <CoachButton label="Ask" sub="free" onClick={() => ask("question")} disabled={disabled || busy} primary />
          <CoachButton label="Nudge" sub={`${COACH_COSTS.nudge} coin`} onClick={() => ask("nudge")} disabled={disabled || busy || tokens < COACH_COSTS.nudge} />
          <CoachButton label="Analogy" sub={`${COACH_COSTS.analogy} coin`} onClick={() => ask("analogy")} disabled={disabled || busy || tokens < COACH_COSTS.analogy} />
        </div>
      </div>
    </section>
  );
}

function CoachButton({ label, sub, onClick, disabled, primary = false }: { label: string; sub: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center rounded-xl px-2 py-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        primary ? "bg-green-600 text-cream-50 hover:bg-green-700" : "border-2 border-amber-400 bg-amber-50 text-ink-900 hover:bg-amber-100"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className={`text-[11px] font-semibold ${primary ? "text-cream-100/80" : "text-amber-700"}`}>{sub}</span>
    </button>
  );
}

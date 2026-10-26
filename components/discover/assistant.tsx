"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SPRINGS } from "@/components/game/springs";
import { CARDS, type ChatTurn, type Discovery } from "@/lib/discover/model";

// Ask Builda: a chat people can open at any point in a discovery. Answers
// come from Builda's own knowledge and the discovery as it stands.

const CardContext = createContext<{ card: number | null; setCard: (c: number | null) => void }>({ card: null, setCard: () => {} });

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [card, setCardState] = useState<number | null>(null);
  const setCard = useCallback((c: number | null) => setCardState(c), []);
  return <CardContext.Provider value={{ card, setCard }}>{children}</CardContext.Provider>;
}

// The cards screen tells the chat which card is open, so questions like
// "what goes here?" make sense.
export function useAssistantCard() {
  return useContext(CardContext).setCard;
}

const CARD_QUESTIONS: Record<string, string[]> = {
  fix: ["What counts as waste we could stop?", "Why fix before automating?"],
  trigger: ["What makes a good trigger?", "Can we have more than one trigger?"],
  steps: ["Which systems should we list?", "How much detail do the steps need?"],
  decision: ["Rule or AI: how do we choose?", "What could go wrong with this decision?"],
  action: ["What actions are safe to automate?", "Who should be told when it runs?"],
  human: ["In the loop or on the loop for us?", "What should the checker see?"],
  rank: ["How is the verdict worked out?", "What does reversibility mean here?"],
};

function suggestions(d: Discovery, card: number | null): string[] {
  if (d.stage === "results" && d.plan) {
    const s = ["Why did we get this verdict?", "Explain our business case", "Is this high-risk under the EU AI Act?", "How do I set up the MCP tool?"];
    if (d.stack.includes("n8n")) s.push("How do I import the n8n file?");
    if (!d.strengthened) s.push("What does Make it stronger do?");
    return s;
  }
  if (d.stage === "cards" && card !== null) return [...(CARD_QUESTIONS[CARDS[card].key] ?? []), "How does the discovery score work?"];
  return ["Which way should we choose a challenge?", "What makes a good challenge?", "How does Start from our week work?"];
}

// Light formatting for answers: paragraphs, bullet lists and **bold**.
function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}

export function Assistant({ discovery }: { discovery: Discovery }) {
  const { card } = useContext(CardContext);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(discovery.chat);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, open]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setTurns((t) => [...t, { role: "user", content: q }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`/api/discover/${discovery.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, card: discovery.stage === "cards" ? card : null }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Something went wrong. Please try again." }));
        throw new Error(err.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: t[t.length - 1].content + chunk }]);
      }
    } catch (error) {
      setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ask-builda"
        className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 font-semibold text-cream-50 shadow-lift hover:bg-green-700"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRINGS.snappy}
      >
        <span aria-hidden>💬</span>
        {open ? "Close" : "Ask Builda"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="ask-builda"
            role="dialog"
            aria-label="Ask Builda"
            className="fixed right-5 bottom-20 z-40 flex max-h-[72vh] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-50 shadow-lift"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={SPRINGS.bouncy}
          >
            <div className="border-b border-cream-300 bg-green-600 px-5 py-3 text-cream-50">
              <p className="font-display text-lg font-bold">Ask Builda</p>
              <p className="text-xs text-cream-100">Ask about any step, your results, or how to build it. It explains; you decide.</p>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
              {turns.length === 0 && <p className="text-ink-500">Hi! Ask me anything about this discovery: what a card means, why you got your verdict, how the business case works, or how to set up the files.</p>}
              {turns.map((t, i) => (
                <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${t.role === "user" ? "rounded-br-sm bg-green-600 text-cream-50" : "rounded-bl-sm bg-white text-ink-900 shadow-card"}`}>
                    {t.role === "assistant" && !t.content ? <span className="text-ink-500">Thinking…</span> : t.role === "assistant" ? <Formatted text={t.content} /> : t.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-cream-300 bg-white px-4 py-3">
              {!busy && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions(discovery, card).slice(0, 4).map((s) => (
                    <button key={s} type="button" onClick={() => void ask(s)} className="rounded-full border border-cream-300 bg-cream-50 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-green-400">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  maxLength={1000}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask(input);
                    }
                  }}
                  placeholder="Type a question…"
                  aria-label="Your question"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-cream-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
                <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-green-700 disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

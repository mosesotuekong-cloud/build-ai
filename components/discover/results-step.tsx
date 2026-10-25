"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { editCards, followUpQuestions, saveToAccount, strengthenDiscovery } from "@/app/discover/actions";
import { ScoreRing } from "@/components/game/score-ring";
import { Button, buttonClasses } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { oversightLabel, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import { READINESS_DIMENSIONS, readinessScore, type FollowUpQuestion } from "@/lib/ai/schemas/discovery";
import { getPlatform } from "@/lib/config/platforms";
import { AI_KINDS, bucketFrom } from "@/lib/discovery/scorecard";
import { coachDesign, type Discovery } from "@/lib/discover/model";
import { orderBlocks } from "@/lib/export/plan";
import { BUCKETS } from "@/lib/report/map";

const file = (id: string, name: string) => `/api/discover/${id}/${name}`;

function Output({ icon, title, text, children }: { icon: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="text-sm text-ink-700">{text}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Step four: the workflow and everything to take away, then "Make it
// stronger" with the AI's follow-up questions.
export function ResultsStep({ discovery, anonymous, onChange }: { discovery: Discovery; anonymous: boolean; onChange: () => void }) {
  const d = discovery;
  const design = coachDesign(d);
  const plan = d.plan;
  const blocks = plan ? orderBlocks(plan) : [];
  const st = d.strengthened;
  const hasN8n = d.stack.includes("n8n");
  const guides = d.stack.filter((s) => s !== "n8n").map((s) => getPlatform(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const bucket = d.rank.value && d.rank.readiness ? BUCKETS.find((b) => b.key === bucketFrom(d.rank.value!, d.rank.readiness!, d.rank.risk ?? "medium")) : null;
  const [mcpOpen, setMcpOpen] = useState(false);
  const [editing, startEditing] = useTransition();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Your workflow{st ? " · strengthened" : ""}</p>
          <h1 className="font-display text-4xl font-bold">{design.name || plan?.name}</h1>
          <p className="text-lg text-ink-700">{st?.summary ?? plan?.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1 text-sm font-semibold">
            {bucket && <span className="rounded-full bg-green-600 px-3 py-1 text-cream-50">{bucket.title}</span>}
            {design.hours_saved_per_month ? <span className="rounded-full bg-cream-200 px-3 py-1">~{design.hours_saved_per_month} hours a month</span> : null}
            {oversightLabel(design.oversight) && <span className="rounded-full bg-amber-100 px-3 py-1">{oversightLabel(design.oversight)}</span>}
            {st && <span className="rounded-full bg-cream-200 px-3 py-1">{AI_KINDS.find((k) => k.value === st.ai_kind)?.label}</span>}
          </div>
        </div>
        {st && <ScoreRing value={readinessScore(st.readiness)} label="Readiness" size={140} />}
      </header>

      {/* The workflow, block by block */}
      <section aria-labelledby="flow-h" className="space-y-3">
        <h2 id="flow-h" className="font-display text-2xl font-bold">
          How it works
        </h2>
        <ol className="flex flex-wrap items-stretch gap-2">
          {blocks.map((b, i) => (
            <li key={b.id} className="flex items-center gap-2">
              <div className={`max-w-56 rounded-xl border-2 px-3 py-2 ${b.slot === "human" || b.kind === "approval" ? "border-amber-400 bg-amber-50" : "border-cream-300 bg-white"}`}>
                <span className="block text-[11px] font-bold tracking-wide text-green-700 uppercase">{SLOT_LABELS[b.slot].title}</span>
                <span className="block font-semibold">{b.label}</span>
                {b.note && <span className="block text-xs text-ink-500">{b.note}</span>}
              </div>
              {i < blocks.length - 1 && (
                <span className="text-xl text-ink-300" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Take it away */}
      <section aria-labelledby="out-h" className="space-y-3">
        <h2 id="out-h" className="font-display text-2xl font-bold">
          Take it away
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Output icon="📄" title="Workflow PDF" text={st ? "The challenge, the workflow, readiness, risks and your next 30 days." : "The challenge, your cards and the workflow, ready to share."}>
            <a href={file(d.id, "pdf")} className={buttonClasses("primary")}>
              Download PDF
            </a>
          </Output>
          <Output icon="🔌" title="Create an MCP tool" text="Let Claude, ChatGPT or Copilot Studio call this workflow as a tool.">
            <Button type="button" variant="secondary" onClick={() => setMcpOpen((o) => !o)} aria-expanded={mcpOpen}>
              {mcpOpen ? "Hide" : "Create MCP tool"}
            </Button>
          </Output>
          {hasN8n ? (
            <Output icon="⚙️" title="n8n workflow" text="Import it into n8n, connect your accounts and test with made-up data.">
              <a href={file(d.id, "n8n")} className={buttonClasses("primary")}>
                Download n8n JSON
              </a>
            </Output>
          ) : (
            <Output icon="🧭" title="Build guides" text="Step-by-step for your tools, slot by slot.">
              {guides.map((g) => (
                <a key={g.slug} href={file(d.id, `guide-${g.slug}`)} className={buttonClasses("secondary", "px-3 py-2 text-sm")}>
                  {g.name}
                </a>
              ))}
            </Output>
          )}
        </div>
        {hasN8n && guides.length > 0 && (
          <p className="text-sm text-ink-700">
            Build guides for the rest of your stack:{" "}
            {guides.map((g, i) => (
              <span key={g.slug}>
                {i > 0 && " · "}
                <a href={file(d.id, `guide-${g.slug}`)} className="font-semibold text-green-700 underline">
                  {g.name}
                </a>
              </span>
            ))}
          </p>
        )}

        {mcpOpen && (
          <div className="space-y-4 rounded-2xl border-2 border-green-200 bg-white p-5">
            <h3 className="font-display text-xl font-bold">Your MCP tool</h3>
            <p className="text-ink-700">
              MCP is the open standard AI apps use to call tools. Your workflow becomes a tool called <code className="rounded bg-cream-100 px-1.5 py-0.5">{(plan?.name ?? "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}</code>.
            </p>
            {hasN8n ? (
              <ol className="list-decimal space-y-2 pl-5 text-ink-700">
                <li>
                  <a href={file(d.id, "mcp-workflow")} className="font-semibold text-green-700 underline">
                    Download the workflow, callable as a tool
                  </a>{" "}
                  and import it into n8n.
                </li>
                <li>
                  <a href={file(d.id, "mcp-server")} className="font-semibold text-green-700 underline">
                    Download the MCP server
                  </a>
                  , import it, and pick your workflow in its tool node.
                </li>
                <li>Add a Bearer Auth token to the MCP Server node, publish both, and paste its Production URL into your AI app.</li>
              </ol>
            ) : (
              <p className="text-ink-700">Download the tool definition and host it on an MCP server that runs your workflow. The file includes setup notes for your stack.</p>
            )}
            <a href={file(d.id, "mcp-tool")} className={buttonClasses("secondary", "px-3 py-2 text-sm")}>
              Download the MCP tool definition
            </a>
            <p className="text-sm text-ink-500">Always add authentication, start read-only, and keep a person approving anything that changes records.</p>
          </div>
        )}
      </section>

      <Strengthen discovery={d} onChange={onChange} />

      <footer className="flex flex-wrap items-center gap-3 border-t border-cream-300 pt-6">
        <Button type="button" variant="ghost" disabled={editing} onClick={() => startEditing(async () => { const r = await editCards(d.id); if (r.ok) onChange(); })}>
          ← Change the cards
        </Button>
        <Link href="/discover/new" className={buttonClasses("secondary")}>
          Start another discovery
        </Link>
        <Link href="/discover" className="font-semibold text-ink-700 hover:text-green-700">
          Your discoveries
        </Link>
      </footer>
      {anonymous && <SaveToAccount />}
    </div>
  );
}

// Strengthen it: the AI asks what a discovery consultant would ask next,
// then improves the design and scores how ready it is.
function Strengthen({ discovery: d, onChange }: { discovery: Discovery; onChange: () => void }) {
  const [questions, setQuestions] = useState<FollowUpQuestion[] | null>(d.questions);
  const [answers, setAnswers] = useState<Record<string, string>>(d.answers ?? {});
  const [open, setOpen] = useState(!d.strengthened && Boolean(d.questions));
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [working, startWorking] = useTransition();
  const st = d.strengthened;

  const load = () =>
    startLoading(async () => {
      setError(null);
      const r = await followUpQuestions(d.id);
      if (!r.ok) return setError(r.error);
      setQuestions(r.questions);
      setOpen(true);
    });

  const submit = () =>
    startWorking(async () => {
      setError(null);
      const r = await strengthenDiscovery(d.id, answers);
      if (!r.ok) return setError(r.error);
      setOpen(false);
      onChange();
    });

  return (
    <section aria-labelledby="strong-h" className="space-y-4 rounded-3xl bg-green-600 p-6 text-cream-50 sm:p-8">
      <div className="max-w-2xl space-y-2">
        <h2 id="strong-h" className="font-display text-3xl font-bold">
          {st ? "Strengthened with your answers" : "Make it stronger"}
        </h2>
        <p className="text-cream-100">
          {st
            ? "The AI improved your workflow from your answers and scored how ready it is. Your downloads now include it."
            : "Answer a few questions a discovery consultant would ask: volumes, data, access, privacy and risk. The AI then improves your workflow, scores how ready it is, and plans your next 30 days."}
        </p>
      </div>

      {st && !open && (
        <div className="grid gap-4 text-ink-900 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-cream-50 p-5">
            <h3 className="font-display text-lg font-bold">How ready it is</h3>
            {READINESS_DIMENSIONS.map((dim) => {
              const x = st.readiness.find((y) => y.key === dim.key);
              return (
                <div key={dim.key}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{dim.label}</span>
                    <span>{x?.score ?? "–"}/5</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200" role="img" aria-label={`${dim.label}: ${x?.score ?? 0} out of 5`}>
                    <div className="h-full rounded-full bg-green-700" style={{ width: `${((x?.score ?? 0) / 5) * 100}%` }} />
                  </div>
                  {x?.note && <p className="mt-0.5 text-sm text-ink-500">{x.note}</p>}
                </div>
              );
            })}
          </div>
          <div className="space-y-4 rounded-2xl bg-cream-50 p-5">
            <div>
              <h3 className="font-display text-lg font-bold">What changed</h3>
              <ul className="list-disc space-y-1 pl-5 text-ink-700">{st.changes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Risks</h3>
              <ul className="space-y-1 text-ink-700">
                {st.risks.map((r) => (
                  <li key={r.risk}>
                    <strong>{r.risk}</strong> {r.mitigation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl bg-cream-50 p-5 lg:col-span-2">
            <h3 className="font-display text-lg font-bold">Your next 30 days</h3>
            <ol className="divide-y divide-cream-200">
              {st.next_steps.map((n) => (
                <li key={n.step} className="grid gap-1 py-2 sm:grid-cols-[6rem_1fr_12rem]">
                  <span className="font-bold">{n.when}</span>
                  <span>{n.step}</span>
                  <span className="text-sm text-ink-500">{n.who}</span>
                </li>
              ))}
            </ol>
            {st.open_questions.length > 0 && (
              <p className="pt-2 text-sm text-ink-700">
                <strong>Still to answer:</strong> {st.open_questions.join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      {open && questions && (
        <form
          className="space-y-4 rounded-2xl bg-cream-50 p-5 text-ink-900"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {questions.map((q, i) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="font-semibold">
                {i + 1}. {q.question}
              </legend>
              <p className="text-sm text-ink-500">{q.why}</p>
              {q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={answers[q.id] === o}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${answers[q.id] === o ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-white hover:border-green-400"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              <TextInput
                value={answers[q.id] ?? ""}
                maxLength={500}
                placeholder={q.options ? "Or type your own answer" : "Your answer"}
                aria-label={q.question}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            </fieldset>
          ))}
          <p className="text-sm text-ink-500">Don&apos;t include anyone&apos;s name or personal details.</p>
          <Button type="submit" disabled={working} className="px-7 py-4 text-lg">
            {working ? "Strengthening your workflow…" : "Strengthen my workflow →"}
          </Button>
          {working && <p className="text-sm text-ink-500">The AI is improving your design and rebuilding the workflow. This takes up to a minute.</p>}
        </form>
      )}

      {error && (
        <p className="rounded-xl bg-danger-50 p-3 text-danger-700" role="alert">
          {error}
        </p>
      )}
      {!open && (
        <Button type="button" onClick={questions ? () => setOpen(true) : load} disabled={loading} className="bg-amber-400 text-ink-900 hover:bg-amber-300">
          {loading ? "Thinking of good questions…" : st ? "Change my answers" : "Make it stronger →"}
        </Button>
      )}
    </section>
  );
}

function SaveToAccount() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ done?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="flex max-w-xl flex-wrap items-end gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveToAccount(email);
          setState(r.ok ? { done: true } : { error: r.error });
        });
      }}
    >
      <div className="min-w-60 flex-1 space-y-1">
        <p className="font-semibold">Keep your discoveries</p>
        <p className="text-sm text-ink-500">They&apos;re saved in this browser. Add your email to open them anywhere.</p>
        {state.done ? (
          <p className="pt-1 font-semibold text-green-700" role="status">
            Check your inbox for a link to confirm it.
          </p>
        ) : (
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Your email" />
        )}
        {state.error && (
          <p className="text-sm text-danger-700" role="alert">
            {state.error}
          </p>
        )}
      </div>
      {!state.done && (
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Sending…" : "Save"}
        </Button>
      )}
    </form>
  );
}

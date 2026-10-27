"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState, useTransition } from "react";
import { Stamp } from "@/components/game/stamp";
import { scoreOf } from "@/lib/discover/score";
import { BadgeShelf, BadgeToasts, ScoreBar } from "./board";
import { TwistCard } from "./twist-card";
import { DEMO_ANSWERS } from "@/lib/discover/demo-scenario";
import { editCards, followUpQuestions, saveToAccount, strengthenDiscovery } from "@/app/discover/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import { READINESS_DIMENSIONS, readinessScore, type FollowUpQuestion } from "@/lib/ai/schemas/discovery";
import { getPlatform } from "@/lib/config/platforms";
import { aiActOf, businessInputsOf, businessOf, verdictOf } from "@/lib/discover/insights";
import { AI_ACT_LABELS } from "@/lib/discover/ai-act";
import { paybackText } from "@/lib/discover/business";
import { money } from "@/lib/discover/regions";
import { VERDICTS } from "@/lib/discover/verdict";
import { AiActPanel, BusinessCasePanel, VerdictPanel } from "./worth-panels";
import { FeedbackBox } from "./feedback-box";
import { coachDesign, regionOf, type Discovery } from "@/lib/discover/model";
import { packagesFor } from "@/lib/export/packages";
import { orderBlocks } from "@/lib/export/plan";

const file = (id: string, name: string) => `/api/discover/${id}/${name}`;

// Step four: the workflow and everything to take away, then "Make it
// stronger" with the AI's follow-up questions.
export function ResultsStep({ discovery, anonymous, onChange }: { discovery: Discovery; anonymous: boolean; onChange: () => void }) {
  const d = discovery;
  const design = coachDesign(d);
  const plan = d.plan;
  const blocks = plan ? orderBlocks(plan) : [];
  const st = d.strengthened;
  const hasN8n = d.stack.includes("n8n");
  const packages = packagesFor(d.stack);
  const guides = d.stack.filter((s) => s !== "n8n").map((s) => getPlatform(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const { verdict, reasons } = verdictOf(d);
  const region = regionOf(d);
  const aiAct = aiActOf(d);
  const score = scoreOf(d);
  // The reveal: the verdict stamps down once, the first time results open.
  const [stamp, setStamp] = useState(false);
  useEffect(() => {
    const key = `builda-revealed-${d.id}-${d.plan?.name ?? ""}-${verdict ?? ""}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: show the stamp anyway.
    }
    if (seen || !verdict) return;
    const show = setTimeout(() => setStamp(true), 900);
    const hide = setTimeout(() => setStamp(false), 3200);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [d.id, d.plan?.name, verdict]);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [editing, startEditing] = useTransition();
  const biz = businessOf(d);
  const likely = biz.result.scenarios[1];
  const cash = (n: number) => money(n, region.currency);
  const actShort = { prohibited: "Likely banned", high_risk: "Check needed", transparency: "Must say it's AI", minimal: "Minimal risk" }[aiAct.category];
  const toolName = (plan?.name ?? "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const earned = score.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Your workflow{st ? " · strengthened" : ""}</p>
          <h1 className="font-display text-4xl font-bold">{design.name || plan?.name}</h1>
          <p className="text-lg text-ink-700">{st?.summary ?? plan?.summary}</p>
        </div>
        <ScoreBar points={score.points} max={score.max} level={score.level} next={score.next} />
      </header>

      {/* 1. The answer at a glance */}
      <section aria-labelledby="glance-h" className="relative space-y-2">
        <h2 id="glance-h" className="text-sm font-bold tracking-wide text-ink-500 uppercase">
          At a glance
        </h2>
        <div className={`grid gap-3 sm:grid-cols-2 ${st ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          <Glance label="Verdict" value={verdict ? VERDICTS[verdict].title : "Not rated"} note={reasons[0] ?? ""} tone={verdict === "fund" ? "good" : verdict ? "warn" : "plain"} />
          <Glance label="Likely payback" value={paybackText(likely.paybackMonths)} note={`${cash(likely.netPerMonth)} a month saved, after running costs`} />
          <Glance label="Time freed" value={`${Math.round(likely.hoursSavedPerMonth)} hours a month`} note={`of about ${Math.round(biz.result.hoursTodayPerMonth)} spent on it today`} />
          <Glance label="EU AI Act" value={actShort} note={aiAct.area ?? (aiAct.category === "minimal" ? "No high-risk use spotted" : "")} tone={aiAct.category === "high_risk" || aiAct.category === "prohibited" ? "warn" : "plain"} />
          {st && <Glance label="Readiness" value={`${readinessScore(st.readiness)} / 100`} note="from your answers below" />}
        </div>
        {verdict && <Stamp show={stamp} text={{ fund: "Fund it", plan: "Plan it", fix_data: "Fix data", park: "Park it" }[verdict]} tone={verdict === "fund" ? "green" : "amber"} />}
      </section>

      {/* 2. What to do next, and the files */}
      <section aria-labelledby="next-h" className="space-y-4 rounded-3xl border-2 border-green-600 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <h2 id="next-h" className="font-display text-2xl font-bold">
              {st ? "Next: take it to your team" : "Next: make it stronger"}
            </h2>
            <p className="text-ink-700">
              {st
                ? "Share the PDF with whoever owns the budget and give the workflow file to your builder. Your 30-day plan is further down."
                : "Answer a few questions a discovery consultant would ask (about 3 minutes). The AI sharpens the workflow, scores how ready it is and plans your next 30 days."}
            </p>
          </div>
          {st ? (
            <a href={file(d.id, "pdf")} className={buttonClasses("primary", "px-6 py-3 text-lg")}>
              Download the PDF
            </a>
          ) : (
            <a href="#strong-h" className={buttonClasses("primary", "px-6 py-3 text-lg")}>
              Make it stronger ↓
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
          <span className="mr-1 text-sm font-semibold text-ink-500">Take it away:</span>
          <a href={file(d.id, "pdf")} className={buttonClasses("secondary", "px-3 py-1.5 text-sm")}>
            📄 Workflow PDF
          </a>
          {hasN8n && (
            <a href={file(d.id, "n8n")} className={buttonClasses("secondary", "px-3 py-1.5 text-sm")}>
              ⚙️ n8n JSON
            </a>
          )}
          {packages.map((p) => (
            <a key={p.key} href={file(d.id, p.key)} className={buttonClasses("secondary", "px-3 py-1.5 text-sm")}>
              {p.icon} {p.label}
            </a>
          ))}
          <a href="#mcp" onClick={() => setMcpOpen(true)} className={buttonClasses("secondary", "px-3 py-1.5 text-sm")}>
            🔌 MCP tool
          </a>
          {guides.map((g) => (
            <a key={g.slug} href={file(d.id, `guide-${g.slug}`)} className={buttonClasses("secondary", "px-3 py-1.5 text-sm")}>
              🧭 {g.name} guide
            </a>
          ))}
        </div>
      </section>

      {/* 3. The workflow, block by block */}
      <section aria-labelledby="flow-h" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="flow-h" className="font-display text-2xl font-bold">
            How it works
          </h2>
          <p className="text-sm text-ink-500">
            Read the steps in order. <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-ink-900">Orange</span> is where a person stays in control.
          </p>
        </div>
        <ol className="flex flex-wrap items-stretch gap-2">
          {blocks.map((b, i) => (
            <motion.li key={b.id} className="flex items-center gap-2" initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.08 * i, type: "spring", stiffness: 380, damping: 22 }}>
              <div className={`max-w-56 rounded-xl border-2 px-3 py-2 ${b.slot === "human" || b.kind === "approval" ? "border-amber-400 bg-amber-50" : "border-cream-300 bg-white"}`}>
                <span className="block text-[11px] font-bold tracking-wide text-green-700 uppercase">
                  {i + 1}. {SLOT_LABELS[b.slot].title}
                </span>
                <span className="block font-semibold">{b.label}</span>
                {b.note && <span className="block text-xs text-ink-500">{b.note}</span>}
              </div>
              {i < blocks.length - 1 && (
                <span className="text-xl text-ink-300" aria-hidden>
                  →
                </span>
              )}
            </motion.li>
          ))}
        </ol>
      </section>

      {/* 4. Make it stronger */}
      <Strengthen discovery={d} onChange={onChange} />

      {/* 5. The detail, folded away until someone wants it */}
      <section aria-labelledby="detail-h" className="space-y-3">
        <h2 id="detail-h" className="font-display text-2xl font-bold">
          The detail behind it
        </h2>
        <Fold title="Why this verdict" summary={reasons.join(" ")}>
          <VerdictPanel verdict={verdict} reasons={reasons} rank={{ ...d.rank, oversight: design.oversight ?? null }} />
        </Fold>
        <Fold title="The business case" summary={`Three scenarios from cautious to optimistic. Open it to check or change the numbers.`}>
          <BusinessCasePanel key={JSON.stringify(businessInputsOf(d))} id={d.id} initial={businessInputsOf(d)} currency={region.currency} />
        </Fold>
        <Fold title="EU AI Act check" summary={`${AI_ACT_LABELS[aiAct.category].title}. A first read, not legal advice.`}>
          <AiActPanel check={aiAct} emphasise={region.euAiAct} />
        </Fold>
        {packages.length > 0 && (
          <Fold title="How to use the starter packages" summary={`${packages.map((p) => p.label).join(", ")}: what's inside and how to import ${packages.length > 1 ? "them" : "it"}.`}>
            <div className="space-y-4">
              {packages.map((p) => (
                <div key={p.key} className="space-y-1">
                  <h3 className="font-display text-lg font-bold">
                    {p.icon} {p.label}
                  </h3>
                  <p className="text-ink-700">{p.what}</p>
                  <p className="text-ink-700">
                    <strong>How:</strong> {p.how}
                  </p>
                </div>
              ))}
              <p className="text-sm text-ink-500">
                Every value that starts with REPLACE needs filling in, and no credentials are included. These follow the vendors&apos; published formats but haven&apos;t been test-imported on a live system yet, so try them on a test workspace with made-up data first.
              </p>
            </div>
          </Fold>
        )}
        <Fold id="mcp" open={mcpOpen} onToggle={setMcpOpen} title="Create an MCP tool" summary="Let Claude, ChatGPT or Copilot Studio call this workflow as a tool.">
          <div className="space-y-3">
            <p className="text-ink-700">
              MCP is the open standard AI apps use to call tools. Your workflow becomes a tool called <code className="rounded bg-cream-100 px-1.5 py-0.5">{toolName}</code>.
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
        </Fold>
      </section>

      {/* 6. Play on */}
      <section aria-labelledby="play-h" className="space-y-3">
        <h2 id="play-h" className="font-display text-2xl font-bold">
          Play on
        </h2>
        <TwistCard id={d.id} initial={d.game.twist} onChange={onChange} />
        <Fold title={`Your badges: ${earned} of ${score.badges.length}`} summary="Points reward thinking, never speed. Open to see how to earn the rest.">
          <BadgeShelf badges={score.badges} />
        </Fold>
      </section>
      <BadgeToasts badges={score.badges} />

      <FeedbackBox id={d.id} initial={d.feedback} />

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

const GLANCE_TONE = { good: "border-green-600 bg-green-50", warn: "border-amber-400 bg-amber-50", plain: "border-cream-300 bg-cream-50" } as const;

// One answer at a glance: a label, a big value and one line of context.
function Glance({ label, value, note, tone = "plain" }: { label: string; value: string; note: string; tone?: keyof typeof GLANCE_TONE }) {
  return (
    <div className={`space-y-1 rounded-2xl border-2 p-4 ${GLANCE_TONE[tone]}`}>
      <p className="text-xs font-bold tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="font-display text-2xl leading-tight font-bold">{value}</p>
      {note && <p className="text-sm text-ink-700">{note}</p>}
    </div>
  );
}

// A section folded away until someone opens it.
function Fold({ id, title, summary, open, onToggle, children }: { id?: string; title: string; summary: string; open?: boolean; onToggle?: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <details id={id} open={open} onToggle={onToggle ? (e) => onToggle(e.currentTarget.open) : undefined} className="group scroll-mt-6 rounded-2xl border border-cream-300 bg-cream-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-display text-lg font-bold">{title}</span>
          <span className="block text-sm text-ink-700">{summary}</span>
        </span>
        <span className="text-xl text-ink-500 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="border-t border-cream-200 p-4">{children}</div>
    </details>
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
          {d.game.demo && (
            <button
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, ...Object.fromEntries(questions.map((q) => [q.id, a[q.id] || DEMO_ANSWERS[q.topic] || ""])) }))}
              className="rounded-full border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-ink-900 hover:bg-amber-100"
            >
              ✨ Fill demo answers
            </button>
          )}
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
        <Button type="button" onClick={questions ? () => setOpen(true) : load} disabled={loading} variant="accent">
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

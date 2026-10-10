import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { ReportProse } from "@/lib/ai/schemas/report";
import { AI_KINDS, FREQUENCIES } from "@/lib/discovery/scorecard";
import { BUCKETS, bucketTitle, type OpportunityMap, type UseCase } from "@/lib/report/map";
import { oversightLabel } from "@/lib/ai/schemas/canvas";

const readinessText = (r: string | null) => (r === "not_ready" ? "not ready" : (r ?? "not rated"));

const BUCKET_STYLE: Record<string, string> = {
  quick_win: "border-green-600 bg-green-50",
  strategic_bet: "border-amber-400 bg-amber-50",
  fix_data: "border-ink-300 bg-cream-100",
  park: "border-cream-300 bg-cream-50",
};
const RISK_STYLE = { low: "bg-green-100 text-green-800", medium: "bg-amber-100 text-amber-700", high: "bg-danger-50 text-danger-700" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const kind = (k: string | null) => AI_KINDS.find((x) => x.value === k)?.label ?? "Unclear";

// The opportunity map, as a document: executive summary first, then the
// portfolio, each use case, raised problems, commitments, before and after,
// and what teams learnt. Plain prose wherever possible.
export function ReportView({ map, prose }: { map: OpportunityMap; prose: ReportProse }) {
  const t = map.totals;
  const note = (ref: string) => prose.use_case_notes.find((n) => n.ref === ref)?.note;
  const byRef = new Map(map.useCases.map((u) => [u.ref, u]));

  return (
    <article className="mx-auto max-w-4xl space-y-12 text-ink-900">
      <header className="space-y-2 border-b-4 border-green-600 pb-6">
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">Opportunity map{map.session.orgName && ` · ${map.session.orgName}`}</p>
        <h1 className="font-display text-4xl font-bold">{map.session.name}</h1>
        <p className="text-ink-500">
          {date(map.session.date)} · {t.teams} teams · {t.players} people
          {map.session.platformNames.length > 0 && ` · Stack: ${map.session.platformNames.join(", ")}`}
        </p>
      </header>

      {/* Executive summary */}
      <section className="space-y-5" aria-labelledby="summary">
        <h2 id="summary" className="font-display text-2xl font-bold">
          Executive summary
        </h2>
        <p className="font-display text-xl font-semibold text-green-800">{prose.headline}</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Automations designed", t.useCases],
            ["Hours a month", t.hoursPerMonth],
            ["Quick wins", t.quick_win],
            ["Commitments", t.commitments],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-cream-100 p-4">
              <dt className="text-xs font-bold tracking-wide text-ink-500 uppercase">{label}</dt>
              <dd className="font-display text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {prose.summary.map((p, i) => (
          <p key={i} className="leading-relaxed text-ink-700">
            {p}
          </p>
        ))}
        {prose.recommendations.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold">What we recommend</h3>
            <ol className="list-decimal space-y-2 pl-6 text-ink-700">
              {prose.recommendations.map((r, i) => (
                <li key={i}>
                  {r.ref && byRef.has(r.ref) && <strong className="text-ink-900">{byRef.get(r.ref)!.designName}. </strong>}
                  {r.text}
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="font-display text-lg font-bold">The next 30 days</h3>
          <ul className="list-disc space-y-1 pl-6 text-ink-700">
            {prose.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Portfolio */}
      <section className="space-y-4" aria-labelledby="portfolio">
        <h2 id="portfolio" className="font-display text-2xl font-bold">
          The portfolio
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {BUCKETS.map((b) => {
            const items = map.useCases.filter((u) => u.bucket === b.key);
            return (
              <div key={b.key} className={`space-y-2 rounded-2xl border-2 p-4 ${BUCKET_STYLE[b.key]}`}>
                <h3 className="font-display text-lg font-bold">
                  {b.title} <span className="text-ink-500">({items.length})</span>
                </h3>
                <p className="text-sm text-ink-500">{b.blurb}</p>
                <ul className="space-y-1 text-sm">
                  {items.map((u) => (
                    <li key={u.ref}>
                      <a href={`#${u.ref}`} className="font-semibold hover:underline">
                        {u.ref} · {u.designName}
                      </a>
                      {u.hoursPerMonth ? <span className="text-ink-500"> · {u.hoursPerMonth} h/month</span> : null}
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-ink-500">None this time.</li>}
                </ul>
              </div>
            );
          })}
        </div>
        {map.useCases.some((u) => u.bucket === null) && (
          <p className="text-sm text-ink-500">
            Not rated yet: {map.useCases.filter((u) => u.bucket === null).map((u) => `${u.ref} ${u.designName}`).join(", ")}.
          </p>
        )}
      </section>

      {/* Use cases */}
      <section className="space-y-6" aria-labelledby="use-cases">
        <h2 id="use-cases" className="font-display text-2xl font-bold">
          The use cases, ranked
        </h2>
        {map.useCases.map((u) => (
          <UseCaseCard key={u.ref} u={u} note={note(u.ref)} />
        ))}
        {map.useCases.length === 0 && <p className="text-ink-500">No team finished a design in this session.</p>}
      </section>

      {map.byPlatform.length > 0 && (
        <section className="space-y-3" aria-labelledby="platforms">
          <h2 id="platforms" className="font-display text-2xl font-bold">
            By platform
          </h2>
          <p className="text-ink-500">Where each use case fits best in the company&apos;s stack.</p>
          <ul className="space-y-2">
            {map.byPlatform.map((p) => (
              <li key={p.slug} className="rounded-xl bg-cream-100 p-3">
                <strong>{p.name}:</strong> {p.refs.map((r) => `${r} ${byRef.get(r)?.designName ?? ""}`).join("; ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {map.raised.length > 0 && (
        <section className="space-y-3" aria-labelledby="raised">
          <h2 id="raised" className="font-display text-2xl font-bold">
            Raised, not yet designed
          </h2>
          <p className="text-ink-500">Problems staff brought from their own work. Good material for the next session.</p>
          <ul className="space-y-2">
            {map.raised.map((r, i) => (
              <li key={i} className="rounded-xl border border-cream-300 p-3">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-ink-700">{r.what_happens}</p>
                <p className="text-xs text-ink-500">
                  {[r.who_feels_it && `Who feels it: ${r.who_feels_it}`, r.frequency && FREQUENCIES.find((f) => f.value === r.frequency)?.label].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="commitments">
        <h2 id="commitments" className="font-display text-2xl font-bold">
          Commitments
        </h2>
        {map.commitments.length ? (
          <ul className="space-y-2">
            {map.commitments.map((c) => (
              <li key={c.ref} className="rounded-xl border-l-4 border-green-600 bg-cream-100 p-3">
                <p>
                  <strong>{c.owner_name}</strong> will take <strong>{c.title}</strong> forward. First step: {c.first_step}
                </p>
                <p className="text-sm text-green-700">By {date(c.due_date)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-500">No commitments were made in this session.</p>
        )}
      </section>

      {map.beforeAfter && (
        <section className="space-y-3" aria-labelledby="before-after">
          <h2 id="before-after" className="font-display text-2xl font-bold">
            Before and after
          </h2>
          <p className="text-ink-700">
            {map.beforeAfter.players} {map.beforeAfter.players === 1 ? "person" : "people"} did a solo design at the start and a matched one at the end. The
            average went from <strong>{map.beforeAfter.before}</strong> to <strong>{map.beforeAfter.after}</strong> out of 100 (
            {map.beforeAfter.change >= 0 ? "+" : ""}
            {map.beforeAfter.change}), and {map.beforeAfter.improved} improved.
          </p>
          <ul className="space-y-2">
            {map.beforeAfter.criteria.map((c) => (
              <li key={c.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{c.label}</span>
                  <span>
                    {c.before}% → {c.after}%
                  </span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-cream-200">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ink-300" style={{ width: `${c.before}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-green-600 opacity-80" style={{ width: `${c.after}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(prose.learning || map.learning.length > 0) && (
        <section className="space-y-3" aria-labelledby="learning">
          <h2 id="learning" className="font-display text-2xl font-bold">
            Where teams struggled
          </h2>
          {prose.learning && <p className="leading-relaxed text-ink-700">{prose.learning}</p>}
          <ul className="list-disc space-y-1 pl-6 text-sm text-ink-500">
            {map.learning.map((f) => (
              <li key={f.key}>{f.text}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function UseCaseCard({ u, note }: { u: UseCase; note?: string }) {
  return (
    <div id={u.ref} className="scroll-mt-6 space-y-4 rounded-2xl border border-cream-300 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">
            {u.ref} · {u.functionName}
            {u.source === "raised" && " · raised by staff"}
          </p>
          <h3 className="font-display text-xl font-bold">{u.designName}</h3>
          {u.designName !== u.title && <p className="text-sm text-ink-500">Case: {u.title}</p>}
        </div>
        <span className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${BUCKET_STYLE[u.bucket ?? "park"]}`}>{bucketTitle(u.bucket)}</span>
      </div>

      {note && <p className="leading-relaxed text-ink-700">{note}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Fact label="Hours a month" value={u.hoursPerMonth ?? "Not estimated"} />
        <Fact label="Kind of AI" value={kind(u.aiKind)} />
        <Fact label="Best fit" value={u.platformFit?.name ?? "Not chosen"} />
        <div>
          <dt className="text-xs text-ink-500">Risk</dt>
          <dd>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${RISK_STYLE[u.risk]}`}>{u.risk}</span>
            {u.riskReasons.length > 0 && <span className="text-xs text-ink-500"> {u.riskReasons.join(", ")}</span>}
          </dd>
        </div>
        <Fact label="Owner" value={u.owner ?? "None yet"} />
        <Fact label="Design score" value={u.rubricScore ?? "Not scored"} />
      </dl>

      <details className="rounded-xl bg-cream-100 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">The team&apos;s design</summary>
        <ul className="mt-2 space-y-1">
          {CANVAS_SLOTS.map((s) => (
            <li key={s}>
              <strong className={s === "human" ? "text-amber-700" : "text-green-700"}>{SLOT_LABELS[s].title}:</strong>{" "}
              {s === "human" && oversightLabel(u.oversight) ? `${oversightLabel(u.oversight)}. ` : ""}
              {u.slots[s] || (s === "human" && u.oversight ? "" : <em>empty</em>)}
            </li>
          ))}
        </ul>
        {u.fix && (
          <p className="mt-2 text-ink-700">
            <strong>Fix it first:</strong> {[u.fix.eliminate && `stop ${u.fix.eliminate}`, u.fix.combine && `merge ${u.fix.combine}`, u.fix.simplify && `simplify ${u.fix.simplify}`].filter(Boolean).join("; ")}
          </p>
        )}
      </details>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-cream-300 p-3">
          <p className="font-semibold">The team&apos;s view</p>
          <p className="text-ink-700">
            Value {u.team.impact ?? "?"}/5 · {readinessText(u.team.readiness)} · {u.team.risk ? `${u.team.risk} risk` : "risk not rated"}
          </p>
          <p className="text-ink-500">{bucketTitle(u.team.bucket)}</p>
        </div>
        <div className="rounded-xl border border-cream-300 p-3">
          <p className="font-semibold">The AI&apos;s view</p>
          {u.ai ? (
            <>
              <p className="text-ink-700">
                Value {u.ai.impact}/5 · {readinessText(u.ai.readiness)} · {u.ai.risk} risk
              </p>
              <p className="text-ink-500">{bucketTitle(u.ai.bucket)}</p>
            </>
          ) : (
            <p className="text-ink-500">No assessment.</p>
          )}
        </div>
      </div>
      {u.disagreements.length > 0 && (
        <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Where they disagree</p>
          <ul className="list-disc pl-5 text-ink-700">
            {u.disagreements.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {u.itReasons.length > 0 && (
        <p className="text-sm text-ink-700">
          <strong>Before building:</strong> {u.itReasons.join("; ")}.
        </p>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

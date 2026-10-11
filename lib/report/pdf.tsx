import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { ReportProse } from "@/lib/ai/schemas/report";
import { APP_NAME } from "@/lib/config/app";
import { AI_KINDS } from "@/lib/discovery/scorecard";
import { BUCKETS, bucketTitle, type OpportunityMap } from "./map";
import { oversightLabel } from "@/lib/ai/schemas/canvas";

const readinessText = (r: string | null) => (r === "not_ready" ? "not ready" : (r ?? "not rated"));

// The opportunity map as a PDF. Same content and order as the web report;
// the executive summary fits on page one.

// Builda colours, shared with the website: charcoal, warm greys and one orange.
const C = { green: "#c2500f", greenLight: "#fbefe6", amber: "#f26b1d", amberLight: "#fdf0e6", ink: "#1c1b1a", ink2: "#4a4643", ink3: "#6b6560", cream: "#edeae6", line: "#d2ccc4" };

type Style = Parameters<typeof StyleSheet.create>[0][string];

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 10, color: C.ink, lineHeight: 1.45 },
  eyebrow: { fontSize: 8, color: C.green, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 4, lineHeight: 1.2 },
  meta: { color: C.ink3, marginTop: 2 },
  rule: { borderBottomWidth: 3, borderBottomColor: C.green, marginVertical: 12 },
  h2: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  headline: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.green, marginBottom: 8 },
  p: { marginBottom: 6, color: C.ink2 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: C.cream, borderRadius: 6, padding: 8 },
  statLabel: { fontSize: 7, color: C.ink3, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 14, color: C.ink3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bucket: { width: "48.5%", borderWidth: 1.5, borderRadius: 6, padding: 8 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10, marginBottom: 10 },
  small: { fontSize: 8.5, color: C.ink3 },
  facts: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, marginBottom: 4 },
  fact: { width: "33%", marginBottom: 4 },
  callout: { backgroundColor: C.amberLight, borderLeftWidth: 3, borderLeftColor: C.amber, padding: 6, marginTop: 4 },
  footerLeft: { position: "absolute", bottom: 24, left: 40, fontSize: 8, color: C.ink3 },
  footerRight: { position: "absolute", bottom: 24, right: 40, width: 80, textAlign: "right", fontSize: 8, color: C.ink3 },
});

// Helvetica in PDFs only draws Western European characters.
export function pdfText(text: string): string {
  return text
    .replace(/₦\s?/g, "NGN ")
    .replace(/[→⟶]/g, "->")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[^\u0000-ÿ–—‘’“”•…€]/g, "");
}
const T = ({ style, children }: { style?: Style | Style[]; children: string | number | null | undefined }) => <Text style={style}>{pdfText(String(children ?? ""))}</Text>;

const Bullets = ({ items, numbered = false }: { items: string[]; numbered?: boolean }) => (
  <View>
    {items.map((item, i) => (
      <View key={i} style={s.li} wrap={false}>
        <Text style={s.bullet}>{numbered ? `${i + 1}.` : "•"}</Text>
        <T style={{ flex: 1, color: C.ink2 }}>{item}</T>
      </View>
    ))}
  </View>
);

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const kind = (k: string | null) => AI_KINDS.find((x) => x.value === k)?.label ?? "Unclear";
const BORDER: Record<string, string> = { quick_win: C.green, strategic_bet: C.amber, fix_data: C.ink3, park: C.line };

function ReportDocument({ map, prose }: { map: OpportunityMap; prose: ReportProse }) {
  const t = map.totals;
  const byRef = new Map(map.useCases.map((u) => [u.ref, u]));
  const note = (ref: string) => prose.use_case_notes.find((n) => n.ref === ref)?.note;

  return (
    <Document title={`Opportunity map: ${map.session.name}`} author={APP_NAME} creator={APP_NAME}>
      <Page size="A4" style={s.page}>
        <T style={s.eyebrow}>{`Opportunity map${map.session.orgName ? ` · ${map.session.orgName}` : ""}`}</T>
        <T style={s.h1}>{map.session.name}</T>
        <T style={s.meta}>{`${date(map.session.date)} · ${t.teams} teams · ${t.players} people${map.session.platformNames.length ? ` · Stack: ${map.session.platformNames.join(", ")}` : ""}`}</T>
        <View style={s.rule} />

        <T style={s.h2}>Executive summary</T>
        <T style={s.headline}>{prose.headline}</T>
        <View style={s.stats}>
          {[
            ["Automations designed", t.useCases],
            ["Hours a month", t.hoursPerMonth],
            ["Quick wins", t.quick_win],
            ["Commitments", t.commitments],
          ].map(([label, value]) => (
            <View key={String(label)} style={s.stat}>
              <T style={s.statLabel}>{label}</T>
              <T style={s.statValue}>{value}</T>
            </View>
          ))}
        </View>
        {prose.summary.map((p, i) => (
          <T key={i} style={s.p}>
            {p}
          </T>
        ))}
        {prose.recommendations.length > 0 && (
          <>
            <T style={s.h3}>What we recommend</T>
            <Bullets numbered items={prose.recommendations.map((r) => `${byRef.get(r.ref)?.designName ? `${byRef.get(r.ref)!.designName}. ` : ""}${r.text}`)} />
          </>
        )}
        <T style={s.h3}>The next 30 days</T>
        <Bullets items={prose.next_steps} />

        <Footer map={map} />
      </Page>

      <Page size="A4" style={s.page}>
        <T style={s.h2}>The portfolio</T>
        <View style={s.grid}>
          {BUCKETS.map((b) => {
            const items = map.useCases.filter((u) => u.bucket === b.key);
            return (
              <View key={b.key} style={[s.bucket, { borderColor: BORDER[b.key] }]} wrap={false}>
                <T style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{`${b.title} (${items.length})`}</T>
                <T style={[s.small, { marginBottom: 4 }]}>{b.blurb}</T>
                {items.length ? (
                  items.map((u) => <T key={u.ref}>{`${u.ref} · ${u.designName}${u.hoursPerMonth ? ` · ${u.hoursPerMonth} h/month` : ""}`}</T>)
                ) : (
                  <T style={s.small}>None this time.</T>
                )}
              </View>
            );
          })}
        </View>

        <T style={s.h2}>The use cases, ranked</T>
        {map.useCases.map((u) => (
          <View key={u.ref} style={s.card} wrap={false}>
            <T style={s.small}>{`${u.ref} · ${u.functionName}${u.source === "raised" ? " · raised by staff" : ""} · ${bucketTitle(u.bucket)}`}</T>
            <T style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>{u.designName}</T>
            {note(u.ref) && <T style={[s.p, { marginTop: 3 }]}>{note(u.ref)!}</T>}
            <View style={s.facts}>
              {[
                ["Hours a month", u.hoursPerMonth ?? "Not estimated"],
                ["Kind of AI", kind(u.aiKind)],
                ["Best fit", u.platformFit?.name ?? "Not chosen"],
                ["Risk", `${u.risk[0].toUpperCase()}${u.risk.slice(1)}${u.riskReasons.length ? ` (${u.riskReasons.join(", ")})` : ""}`],
                ["Owner", u.owner ?? "None yet"],
                ["Design score", u.rubricScore ?? "Not scored"],
              ].map(([label, value]) => (
                <View key={String(label)} style={s.fact}>
                  <T style={s.small}>{label}</T>
                  <T style={{ fontFamily: "Helvetica-Bold" }}>{value}</T>
                </View>
              ))}
            </View>
            {CANVAS_SLOTS.map((slot) => (
              <T key={slot} style={{ fontSize: 9, color: C.ink2 }}>{`${SLOT_LABELS[slot].title}: ${slot === "human" && oversightLabel(u.oversight) ? `${oversightLabel(u.oversight)}. ` : ""}${u.slots[slot] || (slot === "human" && u.oversight ? "" : "empty")}`}</T>
            ))}
            <T style={[s.small, { marginTop: 4 }]}>
              {`Team's view: value ${u.team.impact ?? "?"}/5, ${readinessText(u.team.readiness)}, ${u.team.risk ?? "unrated"} risk: ${bucketTitle(u.team.bucket)}.${u.ai ? `  AI's view: value ${u.ai.impact}/5, ${readinessText(u.ai.readiness)}, ${u.ai.risk} risk: ${bucketTitle(u.ai.bucket)}.` : ""}`}
            </T>
            {u.disagreements.length > 0 && (
              <View style={s.callout}>
                <T style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>Where they disagree</T>
                {u.disagreements.map((d, i) => (
                  <T key={i} style={{ fontSize: 9 }}>
                    {d}
                  </T>
                ))}
              </View>
            )}
            {u.itReasons.length > 0 && <T style={[s.small, { marginTop: 4 }]}>{`Before building: ${u.itReasons.join("; ")}.`}</T>}
          </View>
        ))}

        {map.byPlatform.length > 0 && (
          <View wrap={false}>
            <T style={s.h2}>By platform</T>
            <Bullets items={map.byPlatform.map((p) => `${p.name}: ${p.refs.map((r) => `${r} ${byRef.get(r)?.designName ?? ""}`).join("; ")}`)} />
          </View>
        )}

        {map.raised.length > 0 && (
          <>
            <T style={s.h2}>Raised, not yet designed</T>
            <Bullets items={map.raised.map((r) => `${r.title}: ${r.what_happens}`)} />
          </>
        )}

        <T style={s.h2}>Commitments</T>
        {map.commitments.length ? (
          <Bullets items={map.commitments.map((c) => `${c.owner_name} will take ${c.title} forward. First step: ${c.first_step} (by ${date(c.due_date)}).`)} />
        ) : (
          <T style={s.p}>No commitments were made in this session.</T>
        )}

        {map.beforeAfter && (
          <View wrap={false}>
            <T style={s.h2}>Before and after</T>
            <T style={s.p}>
              {`${map.beforeAfter.players} ${map.beforeAfter.players === 1 ? "person" : "people"} did a solo design at the start and a matched one at the end. The average went from ${map.beforeAfter.before} to ${map.beforeAfter.after} out of 100 (${map.beforeAfter.change >= 0 ? "+" : ""}${map.beforeAfter.change}), and ${map.beforeAfter.improved} improved.`}
            </T>
            {map.beforeAfter.criteria.map((c) => (
              <View key={c.key} style={{ marginBottom: 4 }}>
                <T style={{ fontSize: 9 }}>{`${c.label}: ${c.before}% -> ${c.after}%`}</T>
                <View style={{ height: 5, backgroundColor: C.line, borderRadius: 3 }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${c.after}%`, backgroundColor: C.green, borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {(prose.learning || map.learning.length > 0) && (
          <View wrap={false}>
            <T style={s.h2}>Where teams struggled</T>
            {prose.learning ? <T style={s.p}>{prose.learning}</T> : null}
            <Bullets items={map.learning.map((f) => f.text)} />
          </View>
        )}

        <Footer map={map} />
      </Page>
    </Document>
  );
}

function Footer({ map }: { map: OpportunityMap }) {
  return (
    <>
      <Text style={s.footerLeft} fixed>
        {pdfText(`${APP_NAME} · Opportunity map · ${map.session.name}`)}
      </Text>
      <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
    </>
  );
}

export function renderReportPdf(map: OpportunityMap, prose: ReportProse): Promise<Buffer> {
  return renderToBuffer(<ReportDocument map={map} prose={prose} />);
}

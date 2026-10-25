import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { FIX_PROMPTS, oversightLabel, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import { READINESS_DIMENSIONS, readinessScore } from "@/lib/ai/schemas/discovery";
import { APP_NAME } from "@/lib/config/app";
import { getPlatform } from "@/lib/config/platforms";
import { AI_KINDS, bucketFrom, READINESS, RISK_LEVELS, VALUE_LABELS } from "@/lib/discovery/scorecard";
import { orderBlocks } from "@/lib/export/plan";
import { bucketTitle } from "@/lib/report/map";
import { pdfText } from "@/lib/report/pdf";
import { coachDesign, functionLabel, regionOf, type Discovery } from "./model";

// The workflow PDF: one discovery, from the challenge to the next 30 days.
// Same colours as the opportunity map.
const C = { accent: "#c2500f", accentLight: "#fbefe6", ink: "#1c1b1a", ink2: "#4a4643", ink3: "#6b6560", cream: "#edeae6", line: "#d2ccc4" };
type Style = Parameters<typeof StyleSheet.create>[0][string];

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 10, color: C.ink, lineHeight: 1.45 },
  eyebrow: { fontSize: 8, color: C.accent, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 4, lineHeight: 1.2 },
  meta: { color: C.ink3 },
  rule: { borderBottomWidth: 3, borderBottomColor: C.accent, marginVertical: 12 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  p: { marginBottom: 6, color: C.ink2 },
  small: { fontSize: 8.5, color: C.ink3 },
  box: { backgroundColor: C.cream, borderRadius: 6, padding: 10, marginBottom: 8 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: C.cream, borderRadius: 6, padding: 8 },
  statLabel: { fontSize: 7, color: C.ink3, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  step: { flexDirection: "row", marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, color: "#fff", textAlign: "center", fontFamily: "Helvetica-Bold", paddingTop: 5, fontSize: 9, marginRight: 8 },
  stepSlot: { fontSize: 7, color: C.accent, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, color: C.ink3 },
  footerLeft: { position: "absolute", bottom: 24, left: 40, fontSize: 8, color: C.ink3 },
  footerRight: { position: "absolute", bottom: 24, right: 40, width: 80, textAlign: "right", fontSize: 8, color: C.ink3 },
});

const T = ({ style, children }: { style?: Style | Style[]; children: string | number | null | undefined }) => <Text style={style}>{pdfText(String(children ?? ""))}</Text>;
const Bullets = ({ items }: { items: string[] }) => (
  <View>
    {items.map((item, i) => (
      <View key={i} style={s.li} wrap={false}>
        <Text style={s.bullet}>•</Text>
        <T style={{ flex: 1, color: C.ink2 }}>{item}</T>
      </View>
    ))}
  </View>
);

function DiscoveryDocument({ d }: { d: Discovery }) {
  const design = coachDesign(d);
  const st = d.strengthened;
  const region = regionOf(d);
  const stack = d.stack.map((x) => getPlatform(x)?.name).filter(Boolean).join(", ");
  const r = d.rank;
  const bucket = r.value && r.readiness ? bucketFrom(r.value, r.readiness, r.risk ?? "medium") : null;
  const blocks = d.plan ? orderBlocks(d.plan) : [];
  const fix = FIX_PROMPTS.filter((f) => d.design.fix[f.key]?.trim());
  const name = design.name || d.plan?.name || "Our automation";

  return (
    <Document title={`AI discovery: ${name}`} author={APP_NAME} creator={APP_NAME}>
      <Page size="A4" style={s.page}>
        <T style={s.eyebrow}>{`AI discovery · ${functionLabel(d.function_slug)}`}</T>
        <T style={s.h1}>{name}</T>
        <T style={s.meta}>
          {`${new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ${d.players === 1 ? "1 person" : `${d.players} people`} · ${region.name}${stack ? ` · Stack: ${stack}` : ""}`}
        </T>
        <View style={s.rule} />

        {st && (
          <>
            <View style={s.stats}>
              <View style={s.stat}>
                <T style={s.statLabel}>Readiness</T>
                <T style={s.statValue}>{`${readinessScore(st.readiness)} / 100`}</T>
              </View>
              <View style={s.stat}>
                <T style={s.statLabel}>Hours saved a month</T>
                <T style={s.statValue}>{design.hours_saved_per_month ?? "Not known"}</T>
              </View>
              <View style={s.stat}>
                <T style={s.statLabel}>Kind of AI</T>
                <T style={s.statValue}>{AI_KINDS.find((k) => k.value === st.ai_kind)?.label ?? "-"}</T>
              </View>
            </View>
            <T style={s.p}>{st.summary}</T>
          </>
        )}

        <T style={s.h2}>The challenge</T>
        <View style={s.box}>
          <T style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>{d.challenge?.title}</T>
          <T style={{ color: C.ink2 }}>{d.challenge?.story}</T>
          {d.challenge?.cost ? <T style={[s.small, { marginTop: 4 }]}>{`What it costs: ${d.challenge.cost}`}</T> : null}
          {d.challenge?.who_feels_it ? <T style={s.small}>{`Who feels it: ${d.challenge.who_feels_it}`}</T> : null}
        </View>

        {fix.length > 0 && (
          <>
            <T style={s.h2}>Fix it first</T>
            <Bullets items={fix.map((f) => `${f.label}: ${d.design.fix[f.key]}`)} />
          </>
        )}

        <T style={s.h2}>{st ? "The workflow (strengthened)" : "The workflow"}</T>
        {d.plan?.summary ? <T style={s.p}>{d.plan.summary}</T> : null}
        {blocks.length
          ? blocks.map((b, i) => (
              <View key={b.id} style={s.step} wrap={false}>
                <T style={s.stepNum}>{i + 1}</T>
                <View style={{ flex: 1 }}>
                  <T style={s.stepSlot}>{SLOT_LABELS[b.slot].title}</T>
                  <T style={{ fontFamily: "Helvetica-Bold" }}>{b.label}</T>
                  {b.note ? <T style={{ color: C.ink2 }}>{b.note}</T> : null}
                </View>
              </View>
            ))
          : (["trigger", "steps", "decision", "action"] as const).map((slot, i) => (
              <View key={slot} style={s.step} wrap={false}>
                <T style={s.stepNum}>{i + 1}</T>
                <View style={{ flex: 1 }}>
                  <T style={s.stepSlot}>{SLOT_LABELS[slot].title}</T>
                  <T style={{ color: C.ink2 }}>{design[slot] || "Not decided yet"}</T>
                </View>
              </View>
            ))}

        <T style={s.h2}>Control</T>
        <T style={s.p}>{`${oversightLabel(design.oversight) ?? "Not chosen"}. ${design.human}`}</T>

        <T style={s.h2}>Worth it?</T>
        <Bullets
          items={[
            `Value: ${r.value ? VALUE_LABELS[r.value - 1] : "not rated"}`,
            `Ready: ${READINESS.find((x) => x.value === r.readiness)?.label ?? "not rated"}`,
            `Risk: ${RISK_LEVELS.find((x) => x.value === r.risk)?.label ?? "not rated"}`,
            `Where it sits: ${bucketTitle(bucket)}`,
          ]}
        />

        {st && (
          <>
            <T style={s.h2}>How ready it is</T>
            {READINESS_DIMENSIONS.map((dim) => {
              const x = st.readiness.find((y) => y.key === dim.key);
              return (
                <View key={dim.key} style={s.row} wrap={false}>
                  <T style={{ width: 120, fontFamily: "Helvetica-Bold" }}>{dim.label}</T>
                  <T style={{ width: 40 }}>{x ? `${x.score}/5` : "-"}</T>
                  <T style={{ flex: 1, color: C.ink2 }}>{x?.note}</T>
                </View>
              );
            })}
            <T style={s.h2}>What we changed</T>
            <Bullets items={st.changes} />
            <T style={s.h2}>Risks and how to handle them</T>
            <Bullets items={st.risks.map((x) => `${x.risk} ${x.mitigation}`)} />
            <T style={s.h2}>The next 30 days</T>
            {st.next_steps.map((n, i) => (
              <View key={i} style={s.row} wrap={false}>
                <T style={{ width: 60, fontFamily: "Helvetica-Bold" }}>{n.when}</T>
                <T style={{ flex: 1, color: C.ink2 }}>{n.step}</T>
                <T style={{ width: 110, color: C.ink3 }}>{n.who}</T>
              </View>
            ))}
            {st.open_questions.length > 0 && (
              <>
                <T style={s.h2}>Still to answer</T>
                <Bullets items={st.open_questions} />
              </>
            )}
          </>
        )}

        <T style={s.h2}>Build it</T>
        <T style={s.p}>
          {`Made for ${stack || "your stack"}. Download the starter files from ${APP_NAME}: ${d.stack.includes("n8n") ? "an n8n workflow, " : ""}an MCP tool so AI apps can call it, and a build guide for each tool. Build with made-up data first, and keep a person in control of anything that matters.`}
        </T>

        <Text style={s.footerLeft} fixed>
          {pdfText(`${APP_NAME} · AI discovery`)}
        </Text>
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function renderDiscoveryPdf(d: Discovery): Promise<Buffer> {
  return renderToBuffer(<DiscoveryDocument d={d} />);
}

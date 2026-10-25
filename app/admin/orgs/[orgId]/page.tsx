import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { listSignedInUsers } from "@/lib/admin";
import { PHASE_LABELS, type Phase } from "@/lib/session/machine";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveToggle, AddMemberForm, GrantForm, MemberControls } from "../../forms";

export const metadata: Metadata = { title: "Organisation" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function OrgPage({ params }: PageProps<"/admin/orgs/[orgId]">) {
  const { orgId } = await params;
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, is_active, is_demo, session_credits, ai_stack, created_at, org_members (user_id, role, created_at)")
    .eq("id", orgId)
    .maybeSingle();
  if (!org || org.is_demo) notFound();

  const [users, { data: sessions }, { data: grants }, { data: decks }] = await Promise.all([
    listSignedInUsers(admin),
    admin.from("sessions").select("id, name, mode, phase, created_at, reports (status)").eq("org_id", org.id).eq("mode", "live").order("created_at", { ascending: false }).limit(50),
    admin.from("credit_grants").select("id, amount, reason, balance_after, created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(20),
    admin.from("decks").select("id").eq("org_id", org.id),
  ]);
  const emailOf = (id: string) => users.find((u) => u.id === id)?.email ?? "Unknown user";

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm font-semibold text-green-700 hover:underline">
        ← All organisations
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{org.name}</h1>
          <p className="text-ink-500">
            {org.slug} · since {date(org.created_at)} · {decks?.length ?? 0} decks
          </p>
        </div>
        <ActiveToggle orgId={org.id} active={org.is_active} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">Session credits</h2>
            <p className="font-display text-4xl font-bold" aria-label="Credit balance">
              {org.session_credits}
            </p>
          </div>
          <p className="text-sm text-ink-500">One credit is used when a session opens its lobby. Practice runs and demos are free.</p>
          <GrantForm orgId={org.id} />
          {grants?.length ? (
            <ul className="space-y-1.5 border-t border-cream-300 pt-3 text-sm">
              {grants.map((g) => (
                <li key={g.id} className="flex justify-between gap-3">
                  <span>
                    <span className={`font-semibold ${g.amount > 0 ? "text-green-700" : "text-danger-700"}`}>{g.amount > 0 ? `+${g.amount}` : g.amount}</span>{" "}
                    <span className="text-ink-700">{g.reason || "No reason given"}</span>
                  </span>
                  <span className="shrink-0 text-ink-500">
                    {date(g.created_at)} · {g.balance_after} left
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">People ({org.org_members.length})</h2>
          <ul className="space-y-2">
            {org.org_members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-100 px-3 py-2">
                <span className="font-semibold">{emailOf(m.user_id)}</span>
                <MemberControls orgId={org.id} userId={m.user_id} role={m.role} />
              </li>
            ))}
            {!org.org_members.length && <li className="text-ink-500">No one yet.</li>}
          </ul>
          <AddMemberForm orgId={org.id} />
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-xl font-bold">Live sessions</h2>
        {sessions?.length ? (
          <ul className="divide-y divide-cream-300">
            {sessions.map((s) => {
              const report = Array.isArray(s.reports) ? s.reports[0] : s.reports;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-semibold">{s.name || "Untitled session"}</span>
                    <span className="text-sm text-ink-500"> · {date(s.created_at)} · {PHASE_LABELS[s.phase as Phase]?.title ?? s.phase}</span>
                  </span>
                  {report?.status === "done" ? (
                    <a href={`/api/report/${s.id}/pdf`} className="text-sm font-semibold text-green-700 hover:underline">
                      Report PDF
                    </a>
                  ) : (
                    <span className="text-sm text-ink-500">No report yet</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-500">No live sessions yet.</p>
        )}
      </Card>
    </div>
  );
}

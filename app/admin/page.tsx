import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listWaitingUsers } from "@/lib/admin";
import { readServerEnv } from "@/lib/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateOrgForm } from "./forms";

export const metadata: Metadata = { title: "Super admin" };

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never");

export default async function AdminHome() {
  const admin = createAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const env = readServerEnv();

  const [{ data: orgs }, { data: monthSessions }, { count: liveDemos }, { data: demoDay }, waiting] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, is_active, session_credits, created_at, org_members (user_id), sessions (id, mode, phase, created_at)")
      .eq("is_demo", false)
      .order("created_at", { ascending: false }),
    admin.from("sessions").select("id, mode, organizations!inner (is_demo)").eq("organizations.is_demo", false).eq("mode", "live").neq("phase", "draft").gte("created_at", monthStart),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("is_demo", true).gt("demo_expires_at", new Date().toISOString()),
    admin.from("demo_ai_days").select("units").eq("day", today).maybeSingle(),
    listWaitingUsers(admin),
  ]);

  const activeOrgs = (orgs ?? []).filter((o) => o.is_active).length;
  const stats = [
    { label: "Active organisations", value: `${activeOrgs} of ${orgs?.length ?? 0}` },
    { label: "Live sessions this month", value: String(monthSessions?.length ?? 0) },
    { label: "Demo sandboxes open", value: String(liveDemos ?? 0) },
    { label: "Demo AI used today", value: `${demoDay?.units ?? 0} of ${env.DEMO_DAILY_AI_UNITS}` },
  ];

  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl font-bold">Overview</h1>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="space-y-1 p-5">
            <dt className="text-sm text-ink-500">{s.label}</dt>
            <dd className="font-display text-3xl font-bold">{s.value}</dd>
          </Card>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="font-display text-2xl font-bold">
          Waiting for access ({waiting.length})
        </h2>
        <p className="text-ink-500">People who signed in but aren&apos;t in an organisation yet. Add them from an organisation&apos;s page.</p>
        {waiting.length ? (
          <ul className="divide-y divide-cream-300 rounded-2xl border border-cream-300 bg-cream-50">
            {waiting.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="font-semibold">{u.email}</span>
                <span className="text-sm text-ink-500">Last signed in {date(u.lastSignIn)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-cream-200/60 p-4 text-ink-700">No one is waiting.</p>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="orgs-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="orgs-heading" className="font-display text-2xl font-bold">
            Organisations
          </h2>
        </div>
        <CreateOrgForm />
        <div className="overflow-x-auto rounded-2xl border border-cream-300 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-300 text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Organisation</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Credits</th>
                <th className="px-4 py-3 font-semibold">People</th>
                <th className="px-4 py-3 font-semibold">Live sessions</th>
                <th className="px-4 py-3 font-semibold">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {(orgs ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orgs/${o.id}`} className="font-semibold text-green-700 hover:underline">
                      {o.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.is_active ? "bg-green-50 text-green-700" : "bg-cream-200 text-ink-500"}`}>
                      {o.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{o.session_credits}</td>
                  <td className="px-4 py-3">{o.org_members.length}</td>
                  <td className="px-4 py-3">{o.sessions.filter((s) => s.mode === "live" && s.phase !== "draft").length}</td>
                  <td className="px-4 py-3 text-ink-500">{date(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orgs?.length && <p className="p-4 text-ink-500">No organisations yet.</p>}
        </div>
      </section>
    </div>
  );
}

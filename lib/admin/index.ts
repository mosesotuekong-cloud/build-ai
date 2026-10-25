import "server-only";
import { notFound } from "next/navigation";
import { getFacilitatorContext } from "@/lib/auth/facilitator";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// The super admin console is for platform admins only (SUPER_ADMIN_EMAILS).
// Everyone else gets a plain 404, so the console's existence isn't revealed.
export async function requireSuperAdmin() {
  const ctx = await getFacilitatorContext();
  if (!ctx?.isPlatformAdmin) notFound();
  return ctx;
}

// A URL-safe slug from an organisation's name.
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "org"
  );
}

// A slug that isn't taken yet: "acme", then "acme-2", "acme-3"…
export async function uniqueSlug(admin: Admin, name: string): Promise<string> {
  const base = slugify(name);
  const { data } = await admin.from("organizations").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export type SignedInUser = { id: string; email: string; lastSignIn: string | null; createdAt: string };

// Facilitators who have signed in with an email. Anonymous players and demo
// visitors are left out.
export async function listSignedInUsers(admin: Admin): Promise<SignedInUser[]> {
  const users: SignedInUser[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if (u.is_anonymous || !u.email) continue;
      users.push({ id: u.id, email: u.email.toLowerCase(), lastSignIn: u.last_sign_in_at ?? null, createdAt: u.created_at });
    }
    if (data.users.length < 200) break;
  }
  return users;
}

// People who signed in but belong to no organisation yet: the ones waiting
// to be added.
export async function listWaitingUsers(admin: Admin): Promise<SignedInUser[]> {
  const [users, { data: members }, { data: admins }] = await Promise.all([
    listSignedInUsers(admin),
    admin.from("org_members").select("user_id, organizations!inner (is_demo)").eq("organizations.is_demo", false),
    admin.from("platform_admins").select("user_id"),
  ]);
  const linked = new Set([...(members ?? []).map((m) => m.user_id), ...(admins ?? []).map((a) => a.user_id)]);
  return users.filter((u) => !linked.has(u.id)).sort((a, b) => (b.lastSignIn ?? "").localeCompare(a.lastSignIn ?? ""));
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { superAdminEmails } from "@/lib/config/env";

export type Membership = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgActive: boolean;
  sessionCredits: number;
  aiStack: string[];
  role: "admin" | "facilitator";
  isDemo: boolean;
  demoExpiresAt: string | null;
};

export type FacilitatorContext = {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  memberships: Membership[];
  // An anonymous visitor in a demo sandbox (see app/demo).
  isDemo: boolean;
};

// Loads the signed-in facilitator, their orgs and admin status. Returns null
// for signed-out visitors and anonymous players. An anonymous visitor counts
// as a facilitator only inside their own demo sandbox. Cached per request.
export const getFacilitatorContext = cache(async (): Promise<FacilitatorContext | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || (!user.is_anonymous && !user.email)) return null;

  const [{ data: rows }, { data: adminRow }] = await Promise.all([
    supabase
      .from("org_members")
      .select("role, organizations (id, name, slug, is_active, session_credits, ai_stack, is_demo, demo_expires_at)")
      .eq("user_id", user.id),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const memberships: Membership[] = (rows ?? []).flatMap((row) => {
    const org = row.organizations;
    if (!org) return [];
    return [
      {
        orgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        orgActive: org.is_active,
        sessionCredits: org.session_credits,
        aiStack: org.ai_stack,
        role: row.role,
        isDemo: org.is_demo,
        demoExpiresAt: org.demo_expires_at,
      },
    ];
  });

  if (user.is_anonymous) {
    // Anonymous players (in real sessions) never get console access; demo
    // visitors only see live, unexpired sandboxes.
    const sandboxes = memberships.filter((m) => m.isDemo && m.demoExpiresAt && new Date(m.demoExpiresAt) > new Date());
    if (!sandboxes.length) return null;
    return { userId: user.id, email: "Demo visitor", isPlatformAdmin: false, memberships: sandboxes, isDemo: true };
  }
  return { userId: user.id, email: user.email!, isPlatformAdmin: Boolean(adminRow), memberships: memberships.filter((m) => !m.isDemo), isDemo: false };
});

// For pages inside /console. Signed-out visitors go to login; people without
// an active org go to the waiting page (unless they are a platform admin).
export async function requireFacilitator(): Promise<FacilitatorContext & { activeOrg: Membership | null }> {
  const ctx = await getFacilitatorContext();
  if (!ctx) redirect("/login");
  const activeOrg = ctx.memberships.find((m) => m.orgActive) ?? null;
  if (!activeOrg && !ctx.isPlatformAdmin) redirect("/waiting");
  return { ...ctx, activeOrg };
}

// Keeps platform_admins in step with SUPER_ADMIN_EMAILS. Runs after sign-in.
export async function syncPlatformAdmin(userId: string, email: string) {
  const admin = createAdminClient();
  if (superAdminEmails().includes(email.toLowerCase())) {
    await admin.from("platform_admins").upsert({ user_id: userId, email: email.toLowerCase() });
  } else {
    await admin.from("platform_admins").delete().eq("user_id", userId);
  }
}

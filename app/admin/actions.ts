"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { listSignedInUsers, requireSuperAdmin, uniqueSlug } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { ok?: boolean; message?: string };

const idSchema = z.uuid();

const newOrgSchema = z.object({
  name: z.string().trim().min(2, "Give the organisation a name.").max(120),
  credits: z.coerce.number().int().min(0).max(1000).default(0),
});

// Creates an organisation (active, with any starting credits).
export async function createOrg(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireSuperAdmin();
  const parsed = newOrgSchema.safeParse({ name: formData.get("name"), credits: formData.get("credits") || 0 });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  const admin = createAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .insert({ name: parsed.data.name, slug: await uniqueSlug(admin, parsed.data.name), session_credits: 0 })
    .select("id")
    .single();
  if (error || !org) return { message: "We couldn't create that organisation." };
  if (parsed.data.credits > 0) {
    await admin.rpc("grant_session_credits", { target_org: org.id, amount: parsed.data.credits, reason: "Starting credits", granted_by: ctx.userId });
  }
  revalidatePath("/admin");
  redirect(`/admin/orgs/${org.id}`);
}

export async function setOrgActive(orgId: string, active: boolean) {
  await requireSuperAdmin();
  await createAdminClient().from("organizations").update({ is_active: active }).eq("id", idSchema.parse(orgId)).eq("is_demo", false);
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
}

const grantSchema = z.object({
  amount: z.coerce
    .number()
    .int("Whole credits only.")
    .min(-1000)
    .max(1000)
    .refine((n) => n !== 0, "Enter a number of credits to add or remove."),
  reason: z.string().trim().max(200).default(""),
});

// Adds or removes session credits, with a reason, never below zero.
export async function grantCredits(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireSuperAdmin();
  const parsed = grantSchema.safeParse({ amount: formData.get("amount"), reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  const { data: balance } = await createAdminClient().rpc("grant_session_credits", {
    target_org: idSchema.parse(orgId),
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    granted_by: ctx.userId,
  });
  if (balance === null || balance < 0) return { message: "That would take the balance below zero." };
  revalidatePath(`/admin/orgs/${orgId}`);
  return { ok: true, message: `Done. The balance is now ${balance}.` };
}

const memberSchema = z.object({
  email: z.email("That email doesn't look right.").transform((e) => e.toLowerCase()),
  role: z.enum(["admin", "facilitator"]).default("facilitator"),
});

// Adds someone to an organisation. They need to have signed in once (so
// their account exists); the waiting list on the overview shows who has.
export async function addMember(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireSuperAdmin();
  const parsed = memberSchema.safeParse({ email: String(formData.get("email") ?? "").trim(), role: formData.get("role") ?? "facilitator" });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  const admin = createAdminClient();
  const user = (await listSignedInUsers(admin)).find((u) => u.email === parsed.data.email);
  if (!user) return { message: "No one has signed in with that email yet. Ask them to sign in once at the facilitator sign-in page, then add them here." };
  const { error } = await admin
    .from("org_members")
    .upsert({ org_id: idSchema.parse(orgId), user_id: user.id, role: parsed.data.role }, { onConflict: "org_id,user_id" });
  if (error) return { message: "We couldn't add them." };
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
  return { ok: true, message: `${parsed.data.email} can now open the console.` };
}

export async function setMemberRole(orgId: string, userId: string, role: "admin" | "facilitator") {
  await requireSuperAdmin();
  await createAdminClient()
    .from("org_members")
    .update({ role: z.enum(["admin", "facilitator"]).parse(role) })
    .eq("org_id", idSchema.parse(orgId))
    .eq("user_id", idSchema.parse(userId));
  revalidatePath(`/admin/orgs/${orgId}`);
}

export async function removeMember(orgId: string, userId: string) {
  await requireSuperAdmin();
  await createAdminClient().from("org_members").delete().eq("org_id", idSchema.parse(orgId)).eq("user_id", idSchema.parse(userId));
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
}

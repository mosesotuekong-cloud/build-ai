"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getFacilitatorContext } from "@/lib/auth/facilitator";
import { createSandbox, hashIp } from "@/lib/demo/sandbox";
import { createClient } from "@/lib/supabase/server";

export type DemoState = { message?: string };

// "Try the demo": an anonymous sign-in (no email) and a private sandbox.
// A visitor who already has a live sandbox goes straight back to it.
export async function startDemo(): Promise<DemoState> {
  const existing = await getFacilitatorContext();
  if (existing?.isDemo) redirect("/console/demo");
  if (existing) return { message: "You're already signed in. Your console has everything the demo shows." };

  const supabase = await createClient();
  let { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return { message: "We couldn't start the demo just now. Please try again in a minute." };
    auth = { user: data.user };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const result = await createSandbox(auth.user!.id, hashIp(ip));
  if (!result.ok) return { message: result.message };
  redirect("/console/demo");
}

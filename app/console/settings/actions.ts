"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { cleanPlatformSlugs } from "@/lib/config/platforms";
import { createClient } from "@/lib/supabase/server";

export async function saveAiStack(orgId: string, slugs: string[]): Promise<{ ok: boolean; message: string }> {
  await requireFacilitator();
  const supabase = await createClient();
  // The database function checks that the caller is an admin of this org.
  const { error } = await supabase.rpc("set_org_ai_stack", { target_org: z.uuid().parse(orgId), stack: cleanPlatformSlugs(slugs) });
  if (error) return { ok: false, message: "Only organisation admins can change the stack." };
  revalidatePath("/console", "layout");
  return { ok: true, message: "Saved." };
}

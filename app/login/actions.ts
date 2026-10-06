"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readServerEnv } from "@/lib/config/env";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  next: z.string().optional(),
});

// Only allow redirects back into our own app.
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/console";
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined });
  if (!parsed.success) {
    return { status: "error", message: "That doesn't look like an email address. Could you check it?" };
  }

  const { NEXT_PUBLIC_SITE_URL } = readServerEnv();
  const callback = new URL("/auth/callback", NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", safeNext(parsed.data.next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    return { status: "error", message: "We couldn't send the link just now. Please try again in a minute." };
  }
  return { status: "sent", email: parsed.data.email };
}

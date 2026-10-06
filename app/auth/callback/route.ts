import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncPlatformAdmin } from "@/lib/auth/facilitator";

// Magic links land here. Supports both the PKCE `code` flow and the
// `token_hash` flow, so email templates can use either.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawNext = searchParams.get("next") ?? "/console";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/console";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) return NextResponse.redirect(`${origin}/login?error=link`);

  const { data } = await supabase.auth.getUser();
  if (data.user?.email) {
    try {
      await syncPlatformAdmin(data.user.id, data.user.email);
    } catch (syncError) {
      // Not fatal: the person can still use the console as a facilitator.
      console.error("Could not sync platform admin status", syncError instanceof Error ? syncError.message : syncError);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

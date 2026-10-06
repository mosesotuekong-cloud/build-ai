import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";
import { supabasePublicEnv } from "./public-env";

// Refreshes the Supabase session cookie on every request and does an
// optimistic redirect for signed-out visitors to protected areas. Real
// authorisation happens in server code and RLS, not here.
const PROTECTED_PREFIXES = ["/console", "/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it can cause
  // hard-to-debug random sign-outs.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const path = request.nextUrl.pathname;
  const needsFacilitator = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  // Anonymous players never get into the console.
  if (needsFacilitator && (!claims || claims.is_anonymous)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

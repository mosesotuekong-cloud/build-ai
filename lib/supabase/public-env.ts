// Public Supabase settings, safe for the browser. Written out in full so
// Next.js can inline them at build time.
export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Run `npm run db:start` then `npm run env:local` to write .env.local.",
    );
  }
  return { url, anonKey };
}

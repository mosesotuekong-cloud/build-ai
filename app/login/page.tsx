import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/wordmark";
import { getFacilitatorContext } from "@/lib/auth/facilitator";
import { readServerEnv } from "@/lib/config/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  if (await getFacilitatorContext()) redirect(typeof next === "string" ? next : "/console");

  const isLocal = readServerEnv().NEXT_PUBLIC_SUPABASE_URL.includes("127.0.0.1");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <Link href="/" className="block text-center">
          <Wordmark size="md" />
        </Link>
        <Card className="space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold">Facilitator sign in</h1>
            <p className="text-ink-500">No password needed. We&apos;ll email you a link.</p>
          </div>
          {error === "link" && (
            <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
              That sign-in link has expired or was already used. Ask for a fresh one below.
            </p>
          )}
          <LoginForm next={typeof next === "string" ? next : undefined} isLocal={isLocal} />
        </Card>
        <p className="text-center text-sm text-ink-500">Joining a game as a team? Use the code on the big screen.</p>
      </div>
    </main>
  );
}

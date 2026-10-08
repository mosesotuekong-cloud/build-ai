import type { Metadata } from "next";
import { Wordmark } from "@/components/ui/wordmark";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Join a game" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Wordmark size="md" />
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-card">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-3xl font-bold">Join a game</h1>
          <p className="text-ink-500">Type the code on the big screen.</p>
        </div>
        {error === "code" && (
          <p className="rounded-xl bg-danger-50 p-3 text-center text-sm text-danger-700" role="alert">
            That code isn&apos;t open right now. Check it with your facilitator.
          </p>
        )}
        <CodeForm />
      </div>
    </main>
  );
}

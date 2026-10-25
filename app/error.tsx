"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/ui/wordmark";

// Anything unexpected lands here instead of a blank screen. In a live room
// the fix is almost always "try again", so that comes first.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ? `Page error ${error.digest}` : error.message);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md space-y-6 text-center">
        <Wordmark />
        <h1 className="font-display text-3xl font-bold">Something went wrong.</h1>
        <p className="text-ink-700">It&apos;s not you. Try again; your work is saved as you go.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-cream-50 hover:bg-green-700">
            Try again
          </button>
          <Link href="/" className="rounded-xl border-2 border-green-600 px-5 py-3 font-semibold text-ink-900 hover:bg-cream-200">
            Home
          </Link>
        </div>
        {error.digest && <p className="text-xs text-ink-500">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}

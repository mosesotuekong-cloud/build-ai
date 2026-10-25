import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md space-y-6 text-center">
        <Wordmark />
        <h1 className="font-display text-3xl font-bold">We can&apos;t find that page.</h1>
        <p className="text-ink-700">The link may be old, or the session may have ended. If you&apos;re joining a game, use the code on the big screen.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/join" className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-cream-50 hover:bg-green-700">
            Join a game
          </Link>
          <Link href="/" className="rounded-xl border-2 border-green-600 px-5 py-3 font-semibold text-ink-900 hover:bg-cream-200">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

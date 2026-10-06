import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { APP_TAGLINE } from "@/lib/config/app";

const SLOTS = ["Trigger", "Steps", "Decision", "Action", "Human in control"];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Wordmark size="sm" />
        <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-clay-600">
          Facilitator sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-16">
        <div className="max-w-3xl space-y-6">
          <Wordmark size="lg" />
          <p className="font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">{APP_TAGLINE}</p>
          <p className="max-w-2xl text-lg text-ink-700">
            A workshop game where teams design automations for real problems in their own work. Your company leaves with a
            ranked list of what to automate first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={buttonClasses("primary")}>
              Run a session
            </Link>
          </div>
        </div>

        <ol className="grid gap-3 sm:grid-cols-5" aria-label="The five-slot canvas">
          {SLOTS.map((slot, i) => (
            <li key={slot} className="rounded-2xl border border-cream-200 bg-white p-4">
              <span className="font-display text-sm font-bold text-clay-500">{i + 1}</span>
              <p className="font-display text-lg font-semibold">{slot}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

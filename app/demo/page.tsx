import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { readServerEnv } from "@/lib/config/env";
import { StartDemoButton } from "./start-demo-button";

export const metadata: Metadata = { title: "Try the demo" };

const STOPS = [
  { title: "Play a case", text: "Design an automation on the real canvas, with the AI coach. Get a score, a model answer and a starter n8n workflow." },
  { title: "Run a room", text: "Step through a live workshop with three bot teams: the facilitator console, the big screen and your team's phone." },
  { title: "See the payoff", text: "Open a finished opportunity map: the ranked list of what to automate first, with the PDF." },
];

export default function DemoPage() {
  const enabled = readServerEnv().DEMO_ENABLED;
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/">
          <Wordmark size="sm" />
        </Link>
        <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-green-700">
          Facilitator sign in
        </Link>
      </header>
      <section className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-5xl font-bold">Try Builda. No sign-up.</h1>
          <p className="text-xl text-ink-700">
            You get your own private sandbox for 24 hours. Nothing you do there reaches anyone else, and nothing is sent anywhere.
          </p>
          {enabled ? <StartDemoButton /> : <p className="rounded-xl bg-amber-50 p-4 text-amber-700">The demo is switched off right now. Please check back soon.</p>}
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STOPS.map((stop, i) => (
            <li key={stop.title} className="space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 font-display font-bold text-cream-50">{i + 1}</span>
              <h2 className="font-display text-xl font-bold">{stop.title}</h2>
              <p className="text-ink-700">{stop.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-500">
          The demo uses the real AI for a limited number of turns, then switches to scripted replies so it never stops working.
        </p>
      </section>
    </main>
  );
}

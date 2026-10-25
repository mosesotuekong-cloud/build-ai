import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { DemoGame } from "@/components/landing/demo-game";
import { PopHeadline } from "@/components/landing/pop-headline";

const STEPS = [
  { title: "Set up in a minute", text: "Pick the function, how many of you are playing, and the tools in your stack." },
  { title: "Choose the challenge", text: "Bring a real problem, or let the AI suggest three common ones for that function." },
  { title: "Draw the cards", text: "Fix it first, then trigger, steps, decision, action, control. Is it worth it? The AI coaches, never answers." },
  { title: "Take it away", text: "A workflow PDF, an MCP tool for your AI apps, and an n8n file. Then the AI asks what a consultant would, and strengthens it." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-5 text-sm font-semibold text-ink-700">
          <Link href="/discover" className="hover:text-green-700">
            Your discoveries
          </Link>
          <Link href="/login" className="hover:text-green-700">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-10 pb-16 sm:pt-16">
        <div className="max-w-3xl space-y-6">
          <PopHeadline text="Find where AI fits in your work." />
          <p className="max-w-2xl text-xl text-ink-700">
            An AI discovery game for teams. Pick a function and your tech stack, design an automation for a real problem card by card, and leave with a
            workflow you can build.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/discover/new" className={buttonClasses("primary", "px-7 py-4 text-lg")}>
              Start a discovery
            </Link>
            <span className="text-ink-500">About 15 minutes. No sign-up.</span>
          </div>
        </div>

        <DemoGame />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 font-display font-bold text-cream-50">{i + 1}</span>
              <h2 className="font-display text-xl font-bold">{step.title}</h2>
              <p className="text-ink-700">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-green-600 px-4 py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-2xl font-bold text-cream-50">Running a workshop for a whole room?</h2>
            <p className="text-cream-100">Facilitated sessions with live teams, a big screen and an opportunity map for the business are still here.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={buttonClasses("primary", "bg-amber-400 text-ink-900 hover:bg-amber-300 active:bg-amber-500")}>
              Run a workshop
            </Link>
            <Link href="/demo" className={buttonClasses("ghost", "text-cream-50 hover:bg-green-700")}>
              Try the workshop demo
            </Link>
            <Link href="/join" className={buttonClasses("ghost", "text-cream-50 hover:bg-green-700")}>
              Got a game code?
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

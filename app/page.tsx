import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { DemoGame } from "@/components/landing/demo-game";
import { PopHeadline } from "@/components/landing/pop-headline";
import { CodeForm } from "./join/code-form";

const STEPS = [
  { title: "Draw a case", text: "AI writes six real problems from your own function. Teams draw one, like a card." },
  { title: "Build it with a coach", text: "Five slots, one design. The coach asks questions and never gives the answer." },
  { title: "Survive the twist", text: "Halfway through, something changes. Good designs bend instead of breaking." },
  { title: "Leave with a plan", text: "Each team takes home a starter n8n workflow. The business gets a ranked automation map." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Wordmark size="sm" />
        <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-green-700">
          Facilitator sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-10 pb-16 sm:pt-16">
        <div className="max-w-3xl space-y-6">
          <PopHeadline text="Your team knows what's broken." />
          <p className="max-w-2xl text-xl text-ink-700">
            A workshop game where teams design automations for real problems in their own work, and the business leaves with
            a ranked list of what to automate first.
          </p>
          <div className="flex flex-wrap items-end gap-6">
            <Link href="/demo" className={buttonClasses("primary", "px-7 py-4 text-lg")}>
              Try the demo
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "px-7 py-4 text-lg")}>
              Run a session
            </Link>
            <div className="w-full max-w-xs space-y-1.5">
              <p className="text-sm font-semibold text-ink-700">Got a game code?</p>
              <CodeForm compact />
            </div>
          </div>
        </div>

        <DemoGame />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 font-display font-bold text-cream-50">
                {i + 1}
              </span>
              <h2 className="font-display text-xl font-bold">{step.title}</h2>
              <p className="text-ink-700">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-green-600 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl space-y-4">
          <Wordmark size="lg" tone="cream" />
          <p className="text-xl text-cream-100">Automation workshops your team actually finishes.</p>
          <Link href="/login" className={buttonClasses("primary", "bg-amber-400 text-ink-900 hover:bg-amber-300 active:bg-amber-500")}>
            Book a session
          </Link>
        </div>
      </section>
    </main>
  );
}

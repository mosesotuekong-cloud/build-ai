import type { Metadata } from "next";
import { DemoLauncher } from "@/components/discover/demo-launcher";
import { SetupForm } from "@/components/discover/setup-form";

export const metadata: Metadata = { title: "Start a discovery" };

export default function NewDiscoveryPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Step 1 · Set up</p>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Find where AI fits in your work.</h1>
        <p className="text-lg text-ink-700">Four quick choices, then the cards. About 15 minutes, no sign-up.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-cream-300 p-4">
        <p className="text-ink-700">New to Builda? See it done first, with every card filled in.</p>
        <DemoLauncher label="▶ Load the worked example" />
      </div>
      <SetupForm />
    </div>
  );
}

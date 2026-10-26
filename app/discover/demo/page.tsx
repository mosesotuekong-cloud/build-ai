import type { Metadata } from "next";
import { DemoLauncher } from "@/components/discover/demo-launcher";

export const metadata: Metadata = { title: "Worked example" };

// One-click demo mode: opening this page loads the payment-proof checker
// with every card answered, ready to click through.
export default function DemoDiscoveryPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-4xl font-bold">The worked example</h1>
      <p className="text-lg text-ink-700">
        A distributor accepts bank-transfer screenshots as proof of payment, and one Friday a fake one got a truck loaded. Every card is filled in: click through to see the board fill, then build the workflow live.
      </p>
      <DemoLauncher auto />
    </div>
  );
}

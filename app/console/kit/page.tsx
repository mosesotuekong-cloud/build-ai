import type { Metadata } from "next";
import { GameKit } from "./game-kit";

export const metadata: Metadata = { title: "Game kit" };

// A playground for the shared game pieces, so their feel can be reviewed and
// tuned in one place before they appear in live sessions.
export default function GameKitPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Game kit</h1>
        <p className="text-ink-500">The pieces every game screen is built from. Press the buttons to see how they move.</p>
      </div>
      <GameKit />
    </div>
  );
}

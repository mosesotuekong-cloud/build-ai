"use client";

import { useRouter } from "next/navigation";
import type { Discovery } from "@/lib/discover/model";
import { CardsStep } from "./cards-step";
import { ChallengeStep } from "./challenge-step";
import { ResultsStep } from "./results-step";

// One discovery, from the challenge to the results. The server keeps the
// truth; each step refreshes the page when it moves on.
export function DiscoveryGame({ discovery, anonymous }: { discovery: Discovery; anonymous: boolean }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  if (discovery.stage === "challenge" || !discovery.challenge) return <ChallengeStep discovery={discovery} onDone={refresh} />;
  if (discovery.stage === "cards" || !discovery.plan) return <CardsStep key={discovery.challenge.title} discovery={discovery} onBuilt={refresh} />;
  return <ResultsStep discovery={discovery} anonymous={anonymous} onChange={refresh} />;
}

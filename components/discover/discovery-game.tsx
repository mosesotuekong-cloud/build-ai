"use client";

import { useRouter } from "next/navigation";
import type { Discovery } from "@/lib/discover/model";
import { Assistant, AssistantProvider } from "./assistant";
import { CardsStep } from "./cards-step";
import { ChallengeStep } from "./challenge-step";
import { ResultsStep } from "./results-step";

// One discovery, from the challenge to the results, with Ask Builda always
// a click away. The server keeps the truth; each step refreshes the page
// when it moves on.
export function DiscoveryGame({ discovery, anonymous }: { discovery: Discovery; anonymous: boolean }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const step =
    discovery.stage === "challenge" || !discovery.challenge ? (
      <ChallengeStep discovery={discovery} onDone={refresh} />
    ) : discovery.stage === "cards" || !discovery.plan ? (
      <CardsStep key={discovery.challenge.title} discovery={discovery} onBuilt={refresh} />
    ) : (
      <ResultsStep discovery={discovery} anonymous={anonymous} onChange={refresh} />
    );
  return (
    <AssistantProvider>
      {step}
      <Assistant key={discovery.id} discovery={discovery} />
    </AssistantProvider>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the page every few seconds while something is still on its way
// (a score being judged, a model answer being written). Stops when `waiting`
// turns false.
export function RefreshWhile({ waiting, everyMs = 4000 }: { waiting: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!waiting) return;
    const tick = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(tick);
  }, [waiting, everyMs, router]);
  return null;
}

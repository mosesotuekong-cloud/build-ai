"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateReport } from "../../actions";

// Writes the report again, for example after a late override or commitment.
export function RegenerateButton({ sessionId, label = "Write it again" }: { sessionId: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(() => regenerateReport(sessionId))}>
      {pending ? "Starting…" : label}
    </Button>
  );
}

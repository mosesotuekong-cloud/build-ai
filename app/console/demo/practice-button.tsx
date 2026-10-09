"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startPractice } from "@/app/play/actions";

export function PracticeButton({ caseId, label }: { caseId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(() => startPractice(caseId))}>
      {pending ? "Dealing the card…" : label}
    </Button>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startDemo, type DemoState } from "./actions";

export function StartDemoButton() {
  const [state, action, pending] = useActionState<DemoState, FormData>(startDemo, {});
  return (
    <form action={action} className="space-y-3">
      <Button type="submit" disabled={pending} className="px-7 py-4 text-lg">
        {pending ? "Setting up your sandbox…" : "Start the demo"}
      </Button>
      {state.message && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-700" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

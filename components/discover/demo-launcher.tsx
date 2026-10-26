"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startDemoDiscovery } from "@/app/discover/actions";
import { Button } from "@/components/ui/button";

// Loads the worked example (the payment-proof checker). With `auto`, it
// starts as soon as the page opens, so /discover/demo is one click.
export function DemoLauncher({ auto = false, label = "▶ Load the worked example" }: { auto?: boolean; label?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const started = useRef(false);

  const launch = () =>
    start(async () => {
      setError(null);
      const r = await startDemoDiscovery();
      if (r && !r.ok) setError(r.error);
    });

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    launch();
  }, [auto]);

  return (
    <div className="space-y-2">
      <Button type="button" variant={auto ? "primary" : "secondary"} onClick={launch} disabled={pending}>
        {pending ? "Loading the example…" : label}
      </Button>
      {error && (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

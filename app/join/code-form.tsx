"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isValidJoinCode, normaliseJoinCode } from "@/lib/session/codes";

export function CodeForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = normaliseJoinCode(code);
  const valid = isValidJoinCode(clean);

  return (
    <form
      className={compact ? "flex gap-2" : "space-y-4"}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) router.push(`/join/${clean}`);
      }}
    >
      <label className={compact ? "flex-1" : "block"}>
        <span className="sr-only">Game code</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          placeholder="ABC123"
          className={`w-full rounded-2xl border-2 border-cream-300 bg-white text-center font-display font-bold tracking-[0.3em] uppercase outline-none focus:border-green-600 ${
            compact ? "px-3 py-3 text-xl" : "px-4 py-4 text-3xl"
          }`}
          aria-label="Game code"
        />
      </label>
      <Button type="submit" disabled={!valid} className={compact ? "" : "w-full text-lg"}>
        {compact ? "Join" : "Next"}
      </Button>
    </form>
  );
}

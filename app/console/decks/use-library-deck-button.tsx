"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { copyLibraryDeck } from "./actions";

export function UseLibraryDeckButton({ deckId }: { deckId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" className="w-full" disabled={pending} onClick={() => start(() => copyLibraryDeck(deckId))}>
      {pending ? "Copying…" : "Use this deck"}
    </Button>
  );
}

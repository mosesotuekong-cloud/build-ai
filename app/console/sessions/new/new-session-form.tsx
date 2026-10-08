"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { createSession, type CreateSessionState } from "../actions";

type DeckOption = { id: string; name: string; cases: number; functions: number };

const select =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

export function NewSessionForm({ decks, defaultDeck }: { decks: DeckOption[]; defaultDeck?: string }) {
  const [state, action, pending] = useActionState<CreateSessionState, FormData>(createSession, { status: "idle" });
  const [deckId, setDeckId] = useState(decks.find((d) => d.id === defaultDeck)?.id ?? decks[0].id);
  const deck = decks.find((d) => d.id === deckId)!;

  return (
    <form action={action} className="space-y-6">
      <Card className="space-y-5">
        <Field label="Session name" hint="Shown on the presenter screen, for example: Zenith Foods HR away day">
          <TextInput name="name" required minLength={2} maxLength={120} />
        </Field>
        <Field label="Deck">
          <select name="deck_id" value={deckId} onChange={(e) => setDeckId(e.target.value)} className={select}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cases} cases)
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-display text-xl font-bold">How the game runs</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="How teams get a case">
            <select name="case_mode" defaultValue="teams_pick" className={select}>
              <option value="teams_pick">Teams draw a card</option>
              <option value="facilitator_assigns">I assign them</option>
            </select>
          </Field>
          {deck.functions > 1 && (
            <Field label="Mixed-function deck">
              <select name="function_mode" defaultValue="whole_pile" className={select}>
                <option value="whole_pile">Teams draw from the whole pile</option>
                <option value="pick_function">Teams pick their function first</option>
              </select>
            </Field>
          )}
          <Field label="Design time (minutes)">
            <TextInput name="minutes_solving" type="number" min={1} max={120} defaultValue={20} />
          </Field>
          <Field label="Time to adapt after the twist (minutes)">
            <TextInput name="minutes_after_twist" type="number" min={1} max={60} defaultValue={10} />
          </Field>
          <Field label="Hint coins per team">
            <TextInput name="hint_tokens" type="number" min={0} max={10} defaultValue={3} />
          </Field>
          <Field label="Bonus coins when the twist lands">
            <TextInput name="twist_bonus_tokens" type="number" min={0} max={5} defaultValue={1} />
          </Field>
        </div>
        <div className="space-y-3">
          <Toggle name="coach_enabled" label="AI coach" hint="Asks teams questions. Never gives the answer." />
          <Toggle name="twist_enabled" label="Twist" hint="Halfway through, something changes and teams adapt." />
          <Toggle name="before_after_check" label="Before-and-after check" hint="A 4-minute solo round at the start and end, to show what people learned." />
        </div>
      </Card>

      {state.status === "error" && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create draft session"}
      </Button>
    </form>
  );
}

function Toggle({ name, label, hint }: { name: string; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-300 bg-white p-3 has-[:checked]:border-green-600">
      <input type="checkbox" name={name} defaultChecked className="mt-1 h-5 w-5 accent-green-600" />
      <span>
        <span className="block font-semibold text-ink-900">{label}</span>
        <span className="block text-sm text-ink-500">{hint}</span>
      </span>
    </label>
  );
}

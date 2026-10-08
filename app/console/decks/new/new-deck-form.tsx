"use client";

import { useActionState, useState } from "react";
import { DealingOverlay } from "@/components/decks/dealing-overlay";
import { FunctionPicker } from "@/components/decks/function-picker";
import { PlatformPicker } from "@/components/decks/platform-picker";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { STAFF_TOOL_SUGGESTIONS } from "@/lib/config/systems";
import { Card } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { COMPANY_SIZES, functionName } from "@/lib/decks/schemas";
import { createDeck, type FormState } from "../actions";

function listNames(slugs: string[]) {
  const names = slugs.map(functionName);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function NewDeckForm({ orgStack }: { orgStack: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createDeck, { status: "idle" });
  const [functions, setFunctions] = useState<string[]>(["hr"]);
  const [mode, setMode] = useState<"generate" | "empty">("generate");
  const [platforms, setPlatforms] = useState<string[]>(orgStack);
  const [tools, setTools] = useState<string[]>([]);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      <DealingOverlay show={pending && mode === "generate"} message={`Writing six cases for ${listNames(functions)}…`} />
      <input type="hidden" name="mode" value={mode} />

      <Card className="space-y-5">
        <h2 className="font-display text-xl font-bold">About the company</h2>
        <Field label="Deck name" error={e.name} hint="For example: Zenith Foods leadership offsite">
          <TextInput name="name" required maxLength={80} invalid={Boolean(e.name)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Industry" error={e.industry} hint="For example: FMCG distribution, retail banking">
            <TextInput name="industry" required maxLength={120} invalid={Boolean(e.industry)} />
          </Field>
          <Field label="Company size" error={e.company_size}>
            <select
              name="company_size"
              required
              defaultValue=""
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="" disabled>
                Pick one
              </option>
              {COMPANY_SIZES.map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </Field>
        </div>
        <input type="hidden" name="tools" value={tools.join(",")} />
        <ChipSelect
          label="Tools staff use"
          hint="Pick from the list or type your own: the tools people use day to day."
          value={tools}
          onChange={setTools}
          suggestions={STAFF_TOOL_SUGGESTIONS}
          maxLength={40}
        />
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <Field label="Country" error={e.country}>
            <TextInput name="country" defaultValue="Nigeria" maxLength={60} />
          </Field>
          <Field label="Pain points staff have mentioned (optional)" error={e.pain_points} hint="Anything you've heard in the run-up to the session.">
            <TextArea name="pain_points" maxLength={1000} rows={2} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold">Functions</h2>
          <p className="text-sm text-ink-500">Each function gets its own six cases. You can add more functions later.</p>
        </div>
        <FunctionPicker selected={functions} onChange={setFunctions} />
        {e.function_slugs && (
          <p className="text-sm text-danger-700" role="alert">
            {e.function_slugs}
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold">AI tool stack</h2>
          <p className="text-sm text-ink-500">
            {orgStack.length
              ? "Starts with your organisation's stack. The AI favours problems these platforms can solve, and teams get build guides for them."
              : "Pick the platforms this company uses or is considering. Set a default for every deck in Settings."}
          </p>
        </div>
        <PlatformPicker name="target_platforms" selected={platforms} onChange={setPlatforms} />
      </Card>

      {state.status === "error" && state.message && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || functions.length === 0} onClick={() => setMode("generate")}>
          {pending && mode === "generate" ? "Writing cases…" : "Generate cases with AI"}
        </Button>
        <Button type="submit" variant="secondary" disabled={pending || functions.length === 0} onClick={() => setMode("empty")}>
          {pending && mode === "empty" ? "Creating…" : "Start empty and write my own"}
        </Button>
      </div>
    </form>
  );
}

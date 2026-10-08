"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { DealingOverlay } from "@/components/decks/dealing-overlay";
import { FunctionPicker } from "@/components/decks/function-picker";
import { PlatformPicker } from "@/components/decks/platform-picker";
import { GameCard } from "@/components/game/game-card";
import { SPRINGS, seededTilt } from "@/components/game/springs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect } from "@/components/ui/chip-select";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { STAFF_TOOL_SUGGESTIONS } from "@/lib/config/systems";
import { platformNames } from "@/lib/config/platforms";
import { COMPANY_SIZES, functionName } from "@/lib/decks/schemas";
import {
  addFunctions,
  dealMoreCases,
  deleteCase,
  deleteDeck,
  moveCase,
  removeFunction,
  saveCase,
  updateDeckDetails,
  type FormState,
} from "../actions";
import { startPractice } from "@/app/play/actions";

export type DeckCase = {
  id: string;
  function_slug: string;
  title: string;
  story: string;
  cost: string;
  who_feels_it: string;
  source: "ai" | "manual" | "library";
  position: number;
};

export type Deck = {
  id: string;
  name: string;
  industry: string;
  company_size: string;
  tools: string[];
  country: string;
  pain_points: string;
  target_platforms: string[];
  function_slugs: string[];
  cases: DeckCase[];
};

type Editing = { slug: string; existing: DeckCase | null } | null;

export function DeckEditor({ deck, editable, canPlay }: { deck: Deck; editable: boolean; canPlay: boolean }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [dealing, setDealing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const dealMore = (slug: string) => {
    setDealing(`Writing six more ${functionName(slug)} cases…`);
    setNotice(null);
    startTransition(async () => {
      const result = await dealMoreCases(deck.id, slug);
      setDealing(null);
      if (!result.ok) setNotice(result.message ?? "That didn't work. Please try again.");
    });
  };

  return (
    <div className="space-y-8">
      <DealingOverlay show={dealing !== null} message={dealing ?? ""} />

      <DeckHeader deck={deck} editable={editable} />

      {notice && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {notice}
        </p>
      )}

      {deck.function_slugs.map((slug) => {
        const cases = deck.cases.filter((c) => c.function_slug === slug);
        return (
          <section key={slug} className="space-y-4" aria-labelledby={`fn-${slug}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`fn-${slug}`} className="font-display text-2xl font-bold">
                {functionName(slug)} <span className="text-base font-bold text-ink-500">· {cases.length} cases</span>
              </h2>
              {editable && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => dealMore(slug)} disabled={dealing !== null}>
                    Deal six more with AI
                  </Button>
                  <RemoveFunctionButton deckId={deck.id} slug={slug} count={cases.length} />
                </div>
              )}
            </div>

            <ul className="flex flex-wrap gap-6">
              <AnimatePresence initial={false}>
                {cases.map((c, i) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={SPRINGS.gentle}
                    className="space-y-3"
                  >
                    <GameCard
                      title={c.title}
                      story={c.story}
                      cost={c.cost}
                      whoFeelsIt={c.who_feels_it}
                      label={functionName(slug)}
                      number={i + 1}
                      tilt={seededTilt(i + slug.length, 1.5)}
                      onSelect={editable ? () => setEditing({ slug, existing: c }) : undefined}
                    />
                    {canPlay && <PlayButton caseId={c.id} />}
                    {editable && (
                      <CaseControls deckId={deck.id} item={c} first={i === 0} last={i === cases.length - 1} onEdit={() => setEditing({ slug, existing: c })} />
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
              {editable && (
                <li>
                  <button
                    type="button"
                    onClick={() => setEditing({ slug, existing: null })}
                    className="flex h-[23rem] w-60 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-200/50 text-ink-500 shadow-socket transition-colors hover:border-green-400 hover:text-green-700"
                  >
                    <span className="font-display text-4xl font-bold">+</span>
                    <span className="font-bold">Write your own case</span>
                  </button>
                </li>
              )}
            </ul>
          </section>
        );
      })}

      {editable && <AddFunctions deckId={deck.id} existing={deck.function_slugs} onDealing={setDealing} />}

      <CaseDialog deckId={deck.id} editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DeckHeader({ deck, editable }: { deck: Deck; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateDeckDetails(deck.id, prev, formData);
    if (result.status === "saved") setOpen(false);
    return result;
  }, { status: "idle" });
  const [deleting, startDelete] = useTransition();
  const [platforms, setPlatforms] = useState(deck.target_platforms);
  const [tools, setTools] = useState(deck.tools);
  const e = state.errors ?? {};

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">{deck.name}</h1>
          <p className="text-ink-500">
            {[deck.industry, deck.company_size, deck.country].filter(Boolean).join(" · ")}
            {deck.tools.length > 0 && ` · Tools: ${deck.tools.join(", ")}`}
          </p>
          {deck.target_platforms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {platformNames(deck.target_platforms).map((name) => (
                <span key={name} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  {name}
                </span>
              ))}
            </div>
          )}
          {!editable && <p className="text-sm font-semibold text-amber-700">Library deck. Use it from the Decks page to make your own editable copy.</p>}
        </div>
        {editable && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen((o) => !o)}>
              {open ? "Close" : "Edit details"}
            </Button>
            <Button
              variant="ghost"
              className="text-danger-700 hover:bg-danger-50"
              disabled={deleting}
              onClick={() => {
                if (confirm(`Delete "${deck.name}" and all its cases? This can't be undone.`)) startDelete(() => deleteDeck(deck.id));
              }}
            >
              {deleting ? "Deleting…" : "Delete deck"}
            </Button>
          </div>
        )}
      </div>

      {open && (
        <form action={action} className="grid gap-4 border-t border-cream-200 pt-4 sm:grid-cols-2">
          <Field label="Deck name" error={e.name}>
            <TextInput name="name" defaultValue={deck.name} required maxLength={80} invalid={Boolean(e.name)} />
          </Field>
          <Field label="Industry" error={e.industry}>
            <TextInput name="industry" defaultValue={deck.industry} required maxLength={120} invalid={Boolean(e.industry)} />
          </Field>
          <Field label="Company size" error={e.company_size}>
            <select
              name="company_size"
              defaultValue={deck.company_size}
              className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              {[...new Set([deck.company_size, ...COMPANY_SIZES])].filter(Boolean).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Country" error={e.country}>
            <TextInput name="country" defaultValue={deck.country} maxLength={60} />
          </Field>
          <div>
            <input type="hidden" name="tools" value={tools.join(",")} />
            <ChipSelect label="Tools staff use" value={tools} onChange={setTools} suggestions={STAFF_TOOL_SUGGESTIONS} maxLength={40} />
          </div>
          <Field label="Pain points (optional)" error={e.pain_points}>
            <TextArea name="pain_points" defaultValue={deck.pain_points} rows={2} maxLength={1000} />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <span className="text-sm font-semibold text-ink-700">AI tool stack</span>
            <PlatformPicker name="target_platforms" selected={platforms} onChange={setPlatforms} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save details"}
            </Button>
            {state.status === "error" && <span className="text-sm text-danger-700">{state.message}</span>}
            <span className="text-sm text-ink-500">New AI cases will use these details.</span>
          </div>
        </form>
      )}
    </Card>
  );
}

function PlayButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => startPractice(caseId))}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-60"
    >
      {pending ? "Setting up…" : "▶ Play this case"}
    </button>
  );
}

function CaseControls({ deckId, item, first, last, onEdit }: { deckId: string; item: DeckCase; first: boolean; last: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const small = "rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-700 hover:bg-cream-200 disabled:opacity-40";
  return (
    <div className="flex items-center justify-center gap-1" aria-label={`Actions for ${item.title}`}>
      <button type="button" className={small} disabled={pending || first} onClick={() => start(() => moveCase(deckId, item.id, "up"))} aria-label="Move earlier">
        ←
      </button>
      <button type="button" className={small} onClick={onEdit}>
        Edit
      </button>
      <button
        type="button"
        className={`${small} text-danger-700 hover:bg-danger-50`}
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete "${item.title}"?`)) start(() => deleteCase(deckId, item.id));
        }}
      >
        Delete
      </button>
      <button type="button" className={small} disabled={pending || last} onClick={() => start(() => moveCase(deckId, item.id, "down"))} aria-label="Move later">
        →
      </button>
    </div>
  );
}

function RemoveFunctionButton({ deckId, slug, count }: { deckId: string; slug: string; count: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-danger-700 hover:bg-danger-50"
      disabled={pending}
      onClick={() => {
        const warning = count ? ` and its ${count} cases` : "";
        if (confirm(`Remove ${functionName(slug)}${warning} from this deck?`)) start(() => removeFunction(deckId, slug));
      }}
    >
      Remove
    </Button>
  );
}

function AddFunctions({ deckId, existing, onDealing }: { deckId: string; existing: string[]; onDealing: (message: string | null) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  if (existing.length >= 7) return null;

  const add = (generate: boolean) => {
    if (generate) onDealing(`Writing six cases for ${selected.map(functionName).join(", ")}…`);
    start(async () => {
      await addFunctions(deckId, selected, generate);
      onDealing(null);
      setSelected([]);
    });
  };

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold">Add a function</h2>
        <p className="text-sm text-ink-500">Mix functions in one deck, for example HR and Finance teams in the same room.</p>
      </div>
      <FunctionPicker name="add_functions" selected={selected} onChange={setSelected} exclude={existing} />
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending || selected.length === 0} onClick={() => add(true)}>
          Add with AI cases
        </Button>
        <Button variant="secondary" disabled={pending || selected.length === 0} onClick={() => add(false)}>
          Add empty
        </Button>
      </div>
    </Card>
  );
}

function CaseDialog({ deckId, editing, onClose }: { deckId: string; editing: Editing; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (editing && !dialog.open) dialog.showModal();
    if (!editing && dialog.open) dialog.close();
  }, [editing]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-cream-300 bg-cream-50 p-0 shadow-lift backdrop:bg-ink-900/40"
    >
      {editing && <CaseForm key={editing.existing?.id ?? `new-${editing.slug}`} deckId={deckId} editing={editing} onDone={onClose} />}
    </dialog>
  );
}

function CaseForm({ deckId, editing, onDone }: { deckId: string; editing: NonNullable<Editing>; onDone: () => void }) {
  const { slug, existing } = editing;
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveCase(deckId, slug, existing?.id ?? null, prev, formData);
    if (result.status === "saved") onDone();
    return result;
  }, { status: "idle" });
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold">{existing ? "Edit case" : `New ${functionName(slug)} case`}</h2>
        <p className="text-sm text-ink-500">Describe what happens today. Don&apos;t describe the solution; that&apos;s the teams&apos; job.</p>
      </div>
      <Field label="Title" error={e.title} hint="Short and memorable, like “The WhatsApp leave jungle”.">
        <TextInput name="title" defaultValue={existing?.title} required maxLength={80} invalid={Boolean(e.title)} autoFocus />
      </Field>
      <Field label="Story" error={e.story} hint="3 to 5 sentences: who does what by hand, and one moment it went wrong.">
        <TextArea name="story" defaultValue={existing?.story} required maxLength={900} rows={5} invalid={Boolean(e.story)} />
      </Field>
      <Field label="What it costs the business" error={e.cost}>
        <TextInput name="cost" defaultValue={existing?.cost} maxLength={300} invalid={Boolean(e.cost)} />
      </Field>
      <Field label="Who feels it" error={e.who_feels_it}>
        <TextInput name="who_feels_it" defaultValue={existing?.who_feels_it} maxLength={200} invalid={Boolean(e.who_feels_it)} />
      </Field>
      {state.status === "error" && state.message && (
        <p className="text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : existing ? "Save case" : "Add case"}
        </Button>
      </div>
    </form>
  );
}

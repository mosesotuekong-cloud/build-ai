"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";

// Pick several values from a searchable list, or type your own. Selected
// values show as chips. Works with a keyboard: arrows move, Enter adds,
// Backspace on an empty box removes the last chip, Escape closes the list.
export function ChipSelect({
  label,
  hint,
  value,
  onChange,
  suggestions,
  max = 20,
  maxLength = 60,
  placeholder = "Search or type…",
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  max?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = suggestions.filter((s) => !chosen.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q)));
    const exact = suggestions.some((s) => s.toLowerCase() === q) || chosen.has(q);
    return { list: matches.slice(0, 8), custom: q && !exact ? query.trim().slice(0, maxLength) : null };
  }, [query, suggestions, chosen, maxLength]);
  // Suggestions first, so Enter picks the best match; typing your own comes last.
  const items = [...options.list.map((v) => ({ value: v, custom: false })), ...(options.custom ? [{ value: options.custom, custom: true }] : [])];

  const add = (item: string) => {
    const clean = item.trim().slice(0, maxLength);
    if (!clean || chosen.has(clean.toLowerCase()) || value.length >= max) return;
    onChange([...value, clean]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-700">
        {label}
      </label>
      <div
        className="relative flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-2 py-1.5 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {value.map((v) => (
            <motion.span
              key={v}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="inline-flex items-center gap-1 rounded-full bg-green-600 py-1 pr-1 pl-3 text-sm font-semibold text-cream-50"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full text-cream-100 hover:bg-green-800"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-opt-${active}` : undefined}
          value={query}
          maxLength={maxLength}
          placeholder={value.length ? "" : placeholder}
          disabled={value.length >= max}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const pick = items[active]?.value ?? query;
              if (pick.trim()) add(pick);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="min-w-32 flex-1 bg-transparent px-1 py-1.5 text-base outline-none"
        />
        {open && items.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-cream-300 bg-white p-1 shadow-lift"
          >
            {items.map((item, i) => (
              <li
                key={`${item.custom}-${item.value}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(item.value);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-green-50 text-green-700" : "text-ink-700"}`}
              >
                {item.custom ? (
                  <>
                    Add “<strong>{item.value}</strong>”
                  </>
                ) : (
                  item.value
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

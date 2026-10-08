"use client";

import { FUNCTIONS } from "@/lib/config/app";

// Toggle pills for picking business functions. Plain checkboxes underneath,
// so it works in a regular form post.
export function FunctionPicker({
  name = "function_slugs",
  selected,
  onChange,
  exclude = [],
}: {
  name?: string;
  selected: string[];
  onChange: (next: string[]) => void;
  exclude?: string[];
}) {
  const options = FUNCTIONS.filter((f) => !exclude.includes(f.slug));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Business functions">
      {options.map((f) => {
        const on = selected.includes(f.slug);
        return (
          <label
            key={f.slug}
            className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-600 ${
              on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-700 hover:border-green-400"
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={f.slug}
              checked={on}
              onChange={(e) => onChange(e.target.checked ? [...selected, f.slug] : selected.filter((s) => s !== f.slug))}
              className="sr-only"
            />
            {f.name}
          </label>
        );
      })}
    </div>
  );
}

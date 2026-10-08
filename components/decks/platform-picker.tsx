"use client";

import { PLATFORM_CATEGORIES, PLATFORMS, type PlatformCategory } from "@/lib/config/platforms";

// Pick platforms, grouped by category. Plain checkboxes underneath, so it
// works in a regular form post. `limitTo` restricts the choice (for example a
// deck can only target platforms in the organisation's stack).
export function PlatformPicker({
  name = "platforms",
  selected,
  onChange,
  limitTo,
}: {
  name?: string;
  selected: string[];
  onChange: (next: string[]) => void;
  limitTo?: string[];
}) {
  const available = limitTo ? PLATFORMS.filter((p) => limitTo.includes(p.slug)) : PLATFORMS;
  const categories = (Object.keys(PLATFORM_CATEGORIES) as PlatformCategory[]).filter((c) => available.some((p) => p.category === c));

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <fieldset key={category} className="space-y-2">
          <legend className="text-xs font-bold tracking-wide text-ink-500 uppercase">{PLATFORM_CATEGORIES[category]}</legend>
          <div className="flex flex-wrap gap-2">
            {available
              .filter((p) => p.category === category)
              .map((p) => {
                const on = selected.includes(p.slug);
                return (
                  <label
                    key={p.slug}
                    title={p.goodFor}
                    className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-600 ${
                      on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-700 hover:border-green-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={p.slug}
                      checked={on}
                      onChange={(e) => onChange(e.target.checked ? [...selected, p.slug] : selected.filter((s) => s !== p.slug))}
                      className="sr-only"
                    />
                    {p.name}
                    <span className={`ml-1.5 font-normal ${on ? "text-cream-100/80" : "text-ink-500"}`}>{p.vendor !== p.name ? p.vendor : ""}</span>
                  </label>
                );
              })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

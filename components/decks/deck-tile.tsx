import Link from "next/link";
import { functionName } from "@/lib/decks/schemas";

// A deck shown as a small stack of cards with its name on top.
export function DeckTile({
  name,
  industry,
  functions,
  caseCount,
  href,
  library = false,
}: {
  name: string;
  industry: string;
  functions: string[];
  caseCount: number;
  href?: string;
  library?: boolean;
}) {
  const body = (
    <div className="group relative pt-3">
      {/* The stack behind */}
      <div aria-hidden className="absolute inset-x-4 top-0 h-full rotate-[-3deg] rounded-2xl border border-green-700 bg-green-600 transition-transform group-hover:rotate-[-6deg]" />
      <div aria-hidden className="absolute inset-x-2 top-1.5 h-full rotate-[2deg] rounded-2xl border border-cream-300 bg-cream-200 transition-transform group-hover:rotate-[4deg]" />
      <div className="relative space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card transition-transform group-hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-tight font-bold text-ink-900">{name}</h3>
          {library && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Library</span>}
        </div>
        <p className="text-sm text-ink-500">{industry || "No industry set"}</p>
        <div className="flex flex-wrap gap-1.5">
          {functions.map((slug) => (
            <span key={slug} className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
              {functionName(slug)}
            </span>
          ))}
        </div>
        <p className="font-display text-sm font-bold text-ink-700">
          {caseCount} {caseCount === 1 ? "case" : "cases"}
        </p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600">
      {body}
    </Link>
  ) : (
    body
  );
}

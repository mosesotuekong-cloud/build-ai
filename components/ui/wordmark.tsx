import { APP_NAME } from "@/lib/config/app";

// The logo is the product name set as a wordmark. The last letter takes the
// clay accent so it still works if the name changes.
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const name = APP_NAME.toUpperCase();
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-5xl sm:text-6xl" };
  return (
    <span className={`font-display font-extrabold tracking-[0.08em] text-ink-900 ${sizes[size]}`} aria-label={APP_NAME}>
      {name.slice(0, -1)}
      <span className="text-clay-500">{name.slice(-1)}</span>
    </span>
  );
}

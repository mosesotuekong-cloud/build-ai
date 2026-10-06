import { APP_NAME } from "@/lib/config/app";

// The logo is the product name set as a wordmark in Caladea Bold. The last
// letter takes the amber accent, so it still works if the name changes.
export function Wordmark({ size = "md", tone = "ink" }: { size?: "sm" | "md" | "lg" | "xl"; tone?: "ink" | "cream" }) {
  const name = APP_NAME.toUpperCase();
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl sm:text-6xl", xl: "text-6xl sm:text-8xl" };
  const colour = tone === "cream" ? "text-cream-100" : "text-green-600";
  return (
    <span className={`font-display font-bold tracking-[0.1em] ${colour} ${sizes[size]}`} aria-label={APP_NAME}>
      {name.slice(0, -1)}
      <span className="text-amber-400">{name.slice(-1)}</span>
    </span>
  );
}

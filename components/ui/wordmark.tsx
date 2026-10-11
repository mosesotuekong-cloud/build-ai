import { APP_NAME } from "@/lib/config/app";

// The logo is the product name set as a wide wordmark in Archivo Black,
// shared with the website. The last letter is Builda orange, so it still
// works if the name changes.
export function Wordmark({ size = "md", tone = "ink" }: { size?: "sm" | "md" | "lg" | "xl"; tone?: "ink" | "cream" }) {
  const name = APP_NAME.toUpperCase();
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl sm:text-6xl", xl: "text-6xl sm:text-8xl" };
  const colour = tone === "cream" ? "text-cream-100" : "text-ink-900";
  return (
    <span className={`font-wide font-black tracking-[0.06em] ${colour} ${sizes[size]}`} aria-label={APP_NAME}>
      {name.slice(0, -1)}
      <span className="text-amber-400">{name.slice(-1)}</span>
    </span>
  );
}

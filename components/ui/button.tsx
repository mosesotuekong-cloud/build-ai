import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "onDark";

const variants: Record<Variant, string> = {
  primary: "bg-green-600 text-cream-50 hover:bg-green-700 active:bg-green-800 shadow-sm",
  secondary: "border-2 border-green-600 bg-transparent text-green-700 hover:bg-green-50",
  ghost: "bg-transparent text-ink-700 hover:bg-cream-200",
  // The orange call to action, for dark panels. Its own variant, because
  // adding bg-amber-* to "primary" loses to primary's background.
  accent: "bg-amber-400 text-ink-900 hover:bg-amber-300 active:bg-amber-500 shadow-sm",
  // A quiet button on a dark panel.
  onDark: "bg-transparent text-cream-50 hover:bg-green-500",
};

export function buttonClasses(variant: Variant = "primary", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

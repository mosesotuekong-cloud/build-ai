import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-cream-200 bg-white p-6 shadow-[0_1px_0_rgba(36,28,23,0.04)] ${className}`} {...props} />;
}

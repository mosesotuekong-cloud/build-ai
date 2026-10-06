import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-cream-200 bg-cream-50 p-6 shadow-card ${className}`} {...props} />;
}

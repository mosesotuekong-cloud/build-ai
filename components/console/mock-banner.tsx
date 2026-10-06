import type { MockStatus } from "@/lib/config/env";

// Tells the facilitator when the app is running on fixtures instead of real services.
export function MockBanner({ status }: { status: MockStatus }) {
  const active = [status.mockAI && "Mock AI", status.mockN8n && "Mock n8n"].filter(Boolean) as string[];
  if (active.length === 0) return null;
  return (
    <div role="status" className="border-b border-sun-400/40 bg-sun-100 px-4 py-2 text-sm text-sun-700">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        {active.map((label) => (
          <span key={label} className="rounded-full bg-sun-400 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-900">
            {label}
          </span>
        ))}
        <span>Responses come from local sample data. Add the keys in <code>.env.local</code> to go live.</span>
      </div>
    </div>
  );
}

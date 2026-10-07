import type { MockStatus } from "@/lib/config/env";

// Tells the facilitator when the app is running on fixtures instead of real services.
export function MockBanner({ status }: { status: MockStatus }) {
  const active = [status.mockAI && "Mock AI", status.mockN8n && "Mock n8n"].filter(Boolean) as string[];
  if (active.length === 0) return null;
  const live = status.aiProvider === "openai" ? "AI is live on OpenAI. " : status.aiProvider === "anthropic" ? "AI is live on Anthropic. " : "";
  return (
    <div role="status" className="border-b border-amber-400/40 bg-amber-100 px-4 py-2 text-sm text-amber-700">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        {active.map((label) => (
          <span key={label} className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-900">
            {label}
          </span>
        ))}
        <span>
          {live}
          {status.mockAI ? "AI responses come from local sample data. " : ""}
          {status.mockN8n ? "n8n jobs run locally inside the app. " : ""}
          Add the keys in <code>.env.local</code> to go live.
        </span>
      </div>
    </div>
  );
}

// A calm loading state: three cards dealing, then a short line of text.
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24" role="status" aria-live="polite">
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-10 w-7 animate-bounce rounded-md border-b-4 border-green-800 bg-green-600 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="text-ink-500">{label}</p>
    </div>
  );
}

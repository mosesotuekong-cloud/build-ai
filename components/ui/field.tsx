import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 aria-[invalid=true]:border-danger-600";

// A labelled form field with an optional hint and error message.
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-ink-700">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-danger-700" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="block text-sm text-ink-500">{hint}</span>
      )}
    </label>
  );
}

export function TextInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={control} aria-invalid={invalid || undefined} {...props} />;
}

export function TextArea({ invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`${control} min-h-24`} aria-invalid={invalid || undefined} {...props} />;
}

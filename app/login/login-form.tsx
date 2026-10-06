"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next, isLocal }: { next?: string; isLocal: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="space-y-3" role="status">
        <h2 className="font-display text-2xl font-bold">Check your email</h2>
        <p className="text-ink-700">
          We&apos;ve sent a sign-in link to <strong>{state.email}</strong>. It works once and expires in an hour.
        </p>
        {isLocal && (
          <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
            Running locally? Open the test inbox at{" "}
            <a className="font-semibold underline" href="http://localhost:54319" target="_blank" rel="noreferrer">
              localhost:54319
            </a>{" "}
            to find the email.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink-700">Work email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />
      </label>
      {state.status === "error" && (
        <p className="text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}

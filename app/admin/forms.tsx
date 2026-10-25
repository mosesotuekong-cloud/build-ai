"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addMember, createOrg, grantCredits, removeMember, setMemberRole, setOrgActive, type AdminState } from "./actions";

const input = "rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600";

function Note({ state }: { state: AdminState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-danger-700"}`}>
      {state.message}
    </p>
  );
}

export function CreateOrgForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(createOrg, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4">
      <label className="flex min-w-60 flex-1 flex-col gap-1.5">
        <span className="text-sm font-semibold">New organisation</span>
        <input name="name" required maxLength={120} placeholder="Company name" className={input} />
      </label>
      <label className="flex w-36 flex-col gap-1.5">
        <span className="text-sm font-semibold">Starting credits</span>
        <input name="credits" type="number" min={0} max={1000} defaultValue={0} className={input} />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
      </Button>
      <div className="w-full">
        <Note state={state} />
      </div>
    </form>
  );
}

export function GrantForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(grantCredits.bind(null, orgId), {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex w-28 flex-col gap-1.5">
          <span className="text-sm font-semibold">Credits</span>
          <input name="amount" type="number" min={-1000} max={1000} placeholder="+5 or -1" required className={input} aria-label="Credits to add or remove" />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold">Reason</span>
          <input name="reason" maxLength={200} placeholder="e.g. Invoice 014, 5 sessions" className={input} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Apply"}
        </Button>
      </div>
      <Note state={state} />
    </form>
  );
}

export function AddMemberForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(addMember.bind(null, orgId), {});
  return (
    <form action={action} className="space-y-2 border-t border-cream-300 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-52 flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold">Add someone by email</span>
          <input name="email" type="email" required placeholder="name@company.com" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Role</span>
          <select name="role" defaultValue="facilitator" className={input}>
            <option value="facilitator">Facilitator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <Note state={state} />
    </form>
  );
}

export function ActiveToggle({ orgId, active }: { orgId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-sm font-bold ${active ? "bg-green-50 text-green-700" : "bg-cream-200 text-ink-500"}`}>{active ? "Active" : "Paused"}</span>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (active && !confirm("Pause this organisation? Its people won't be able to open the console until you switch it back on.")) return;
          start(() => setOrgActive(orgId, !active));
        }}
      >
        {active ? "Pause" : "Switch on"}
      </Button>
    </div>
  );
}

export function MemberControls({ orgId, userId, role }: { orgId: string; userId: string; role: "admin" | "facilitator" }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-2">
      <select
        value={role}
        disabled={pending}
        onChange={(e) => start(() => setMemberRole(orgId, userId, e.target.value as "admin" | "facilitator"))}
        className="rounded-lg border border-cream-300 bg-white px-2 py-1 text-sm"
        aria-label="Role"
      >
        <option value="facilitator">Facilitator</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Remove this person from the organisation?") && start(() => removeMember(orgId, userId))}
        className="text-sm font-semibold text-danger-700 hover:underline"
      >
        Remove
      </button>
    </span>
  );
}

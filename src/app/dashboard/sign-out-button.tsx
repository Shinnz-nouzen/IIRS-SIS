"use client";

import { useActionState } from "react";
import { signOut } from "./actions";

export function SignOutButton() {
  const [error, action, pending] = useActionState(signOut, null);

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Signing out..." : "Sign out"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

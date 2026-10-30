"use client";

import { useActionState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { signOut } from "./actions";

export function SignOutButton() {
  const { t } = useI18n();
  const [error, action, pending] = useActionState(signOut, null);

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-wait disabled:opacity-70 dark:border-white/15 dark:bg-[#19191f] dark:text-slate-200 dark:hover:bg-white/[0.07]"
        >
          {pending ? t.common.signingOut : t.common.signOut}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
          {t.common.signOutFailed}
        </p>
      )}
    </div>
  );
}

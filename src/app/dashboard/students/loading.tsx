"use client";

import { useI18n } from "@/lib/i18n/provider";

export default function StudentsLoading() {
  const { t } = useI18n();
  return (
    <div role="status" aria-busy="true" className="text-slate-500 dark:text-slate-400">
      <p className="text-sm">{t.directory.loading}</p>
      <div className="mt-5 h-64 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151b]" />
    </div>
  );
}

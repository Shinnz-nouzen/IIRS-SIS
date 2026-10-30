"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { Panel, primaryButtonClass } from "../../sis-ui";

export default function StudentNotFound() {
  const { t } = useI18n();
  return (
    <Panel className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t.profile.notFound}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.profile.notFoundDetail}</p>
      <Link href="/dashboard/students" className={`${primaryButtonClass} mt-5`}>
        {t.profile.back}
      </Link>
    </Panel>
  );
}

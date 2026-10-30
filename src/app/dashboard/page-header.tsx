import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{eyebrow}</p>}
        <h1 className="text-[23px] font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        {detail && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

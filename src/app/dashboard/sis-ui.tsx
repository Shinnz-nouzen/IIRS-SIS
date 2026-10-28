import type { ReactNode } from "react";

export type Section =
  | "Overview"
  | "Students"
  | "Classes"
  | "Attendance"
  | "Grades"
  | "Reports"
  | "Staff & Access"
  | "Settings";

export type IconName =
  | "grid"
  | "users"
  | "book"
  | "calendar"
  | "chart"
  | "settings"
  | "menu"
  | "search"
  | "chevron"
  | "arrow"
  | "sun"
  | "moon"
  | "check"
  | "clock"
  | "plus"
  | "download"
  | "camera"
  | "close"
  | "shield"
  | "file"
  | "refresh"
  | "edit"
  | "external";

export const navigation: { name: Section; icon: IconName }[] = [
  { name: "Overview", icon: "grid" },
  { name: "Students", icon: "users" },
  { name: "Classes", icon: "book" },
  { name: "Attendance", icon: "calendar" },
  { name: "Grades", icon: "chart" },
  { name: "Reports", icon: "file" },
  { name: "Staff & Access", icon: "shield" },
  { name: "Settings", icon: "settings" },
];

export const fieldClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 dark:border-white/15 dark:bg-[#111116] dark:text-slate-100";

export const buttonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-[#19191f] dark:text-slate-200 dark:hover:bg-white/[0.07]";

export const primaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-violet-700 px-3 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50";

export function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    users: <><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H7.4A3.4 3.4 0 0 0 4 18.4V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M20 20v-1.6a3.4 3.4 0 0 0-2.6-3.3M16 4.2a3.5 3.5 0 0 1 0 6.7" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h7M8 10h7" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chart: <><path d="M4 19.5h16M6.5 16V11M12 16V5M17.5 16V8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1A1.7 1.7 0 0 0 4.2 12h-.2a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1A1.7 1.7 0 0 0 20.6 9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.6z" transform="translate(-1 -1) scale(1.08)" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 17v4h14v-4" /></>,
    camera: <><path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151b] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {detail && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {detail}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Active" || status === "Present"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "Pending" || status === "Late" || status === "Unverified"
        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : status === "Missing"
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          : "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  );
}

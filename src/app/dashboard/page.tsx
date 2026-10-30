import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getStudentCounts, type StudentCounts } from "@/lib/sis/student-records";
import { PageHeader } from "./page-header";
import { Icon, Panel, primaryButtonClass } from "./sis-ui";

export const instant = false;

export default async function DashboardPage() {
  const { t } = await getI18n();
  let counts: StudentCounts | null = null;
  try {
    counts = await getStudentCounts();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Dashboard student counts failed.", error);
  }

  return (
    <>
      <PageHeader
        eyebrow={t.brand.school}
        title={t.overview.title}
        detail={t.overview.detail}
        action={
          <Link href="/dashboard/students" className={primaryButtonClass}>
            <Icon name="users" className="size-4" /> {t.overview.openStudents}
          </Link>
        }
      />
      {counts ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={t.overview.total} value={counts.total} />
          <Metric label={t.overview.active} value={counts.active} />
          <Metric label={t.overview.inactive} value={counts.total - counts.active} />
        </div>
      ) : (
        <p role="alert" className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-800 dark:text-rose-200">
          {t.overview.unavailable}
        </p>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel className="p-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </Panel>
  );
}

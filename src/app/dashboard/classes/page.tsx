import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { format } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { listClasses, type ClassRecord } from "@/lib/sis/class-records";
import { PageHeader } from "../page-header";
import { EmptyState, Panel, SectionTitle } from "../sis-ui";
import { ClassForm } from "./class-form";

export const instant = false;

export default async function ClassesPage() {
  const { lang, t } = await getI18n();
  let classes: ClassRecord[] | null = null;
  try {
    classes = await listClasses();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Classes page failed.", error);
  }

  return (
    <>
      <PageHeader eyebrow={t.brand.school} title={t.classes.title} detail={t.classes.detail} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel>
          {!classes ? (
            <p role="alert" className="px-5 py-10 text-center text-sm text-rose-800 dark:text-rose-200">{t.classes.loadError}</p>
          ) : classes.length === 0 ? (
            <EmptyState title={t.classes.empty} detail={t.classes.emptyDetail} />
          ) : (
            <ul>
              {classes.map((record) => (
                <li key={record.id} className="border-b border-slate-100 p-4 last:border-0 dark:border-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {lang === "km" ? record.nameKm ?? record.nameEn : record.nameEn}
                        {!record.isActive && <span className="ml-2 rounded bg-slate-500/10 px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">{t.classes.inactive}</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {record.schoolYear} · {record.gradeLevel}{record.section ? ` · ${record.section}` : ""}
                      </p>
                    </div>
                    <Link href={`/dashboard/students?class=${record.id}`} className="text-xs font-medium text-violet-700 hover:text-violet-600 dark:text-violet-300">
                      {format(t.classes.studentsCount, { n: record.studentCount })} →
                    </Link>
                  </div>
                  <details className="mt-3 rounded-md border border-slate-200 dark:border-white/10">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-violet-800 dark:text-violet-200">{t.classes.edit}</summary>
                    <div key={JSON.stringify(record)} className="border-t border-slate-200 p-4 dark:border-white/10">
                      <ClassForm record={record} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="p-5 lg:self-start">
          <SectionTitle title={t.classes.add} />
          <div className="mt-4">
            <ClassForm />
          </div>
        </Panel>
      </div>
    </>
  );
}

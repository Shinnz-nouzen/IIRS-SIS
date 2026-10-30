import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/dictionaries";
import { listClassOptions, type ClassOption } from "@/lib/sis/class-records";
import { ageInYears, STUDENT_STATUSES, GENDERS, todayInPhnomPenh } from "@/lib/sis/student-validation";
import { displayName } from "@/lib/sis/format";
import {
  getPhotoUrls,
  listStudents,
  type DirectoryFilters,
  type DirectoryPage,
} from "@/lib/sis/student-records";
import { PageHeader } from "../page-header";
import { buttonClass, EmptyState, fieldClass, Icon, Panel, primaryButtonClass, StatusBadge } from "../sis-ui";
import { StudentAvatar } from "./student-avatar";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { lang, t } = await getI18n();
  const params = await searchParams;
  const filters: DirectoryFilters = {
    search: first(params.q).slice(0, 100),
    status: (STUDENT_STATUSES as readonly string[]).includes(first(params.status)) ? first(params.status) : "",
    gender: (GENDERS as readonly string[]).includes(first(params.gender)) ? first(params.gender) : "",
    classId: first(params.class).slice(0, 36),
    missing: ["guardian", "emergency", "photo", "location"].includes(first(params.missing)) ? first(params.missing) : "",
    sort: ["id", "name", "updated"].includes(first(params.sort)) ? first(params.sort) : "id",
    page: Number.parseInt(first(params.page), 10) || 1,
  };

  let result: DirectoryPage | null = null;
  let classes: ClassOption[] = [];
  let photoUrls: Record<string, string> = {};
  try {
    [result, classes] = await Promise.all([listStudents(filters), listClassOptions()]);
    photoUrls = await getPhotoUrls(result.rows.map((row) => row.photoPath));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Student directory page failed.", error);
  }

  const filtersActive = Boolean(
    filters.search || filters.status || filters.gender || filters.classId || filters.missing,
  );
  const today = todayInPhnomPenh();

  function pageHref(page: number): string {
    const query = new URLSearchParams();
    if (filters.search) query.set("q", filters.search);
    if (filters.status) query.set("status", filters.status);
    if (filters.gender) query.set("gender", filters.gender);
    if (filters.classId) query.set("class", filters.classId);
    if (filters.missing) query.set("missing", filters.missing);
    if (filters.sort !== "id") query.set("sort", filters.sort);
    if (page > 1) query.set("page", String(page));
    const text = query.toString();
    return text ? `/dashboard/students?${text}` : "/dashboard/students";
  }

  return (
    <>
      <PageHeader
        eyebrow={t.brand.school}
        title={t.directory.title}
        detail={t.directory.detail}
        action={
          <Link href="/dashboard/students/new" className={primaryButtonClass}>
            <Icon name="plus" className="size-4" /> {t.directory.add}
          </Link>
        }
      />

      <Panel className="mb-4 p-4">
        <form method="get" action="/dashboard/students" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t.directory.searchLabel}</label>
            <input id="q" name="q" type="search" defaultValue={filters.search} placeholder={t.directory.searchPlaceholder} className={fieldClass} />
          </div>
          <FilterSelect id="status" label={t.directory.statusLabel} value={filters.status} all={t.directory.allStatuses}
            options={STUDENT_STATUSES.map((value) => ({ value, label: t.status[value] }))} />
          <FilterSelect id="gender" label={t.directory.genderLabel} value={filters.gender} all={t.directory.allGenders}
            options={GENDERS.map((value) => ({ value, label: t.gender[value] }))} />
          <FilterSelect id="class" label={t.directory.classLabel} value={filters.classId} all={t.directory.allClasses}
            options={[
              { value: "none", label: t.directory.noClass },
              ...classes.map((option) => ({
                value: option.id,
                label: `${lang === "km" ? option.nameKm ?? option.nameEn : option.nameEn} · ${option.schoolYear}`,
              })),
            ]} />
          <FilterSelect id="missing" label={t.directory.missingLabel} value={filters.missing} all={t.directory.missingAny}
            options={[
              { value: "guardian", label: t.directory.missingGuardian },
              { value: "emergency", label: t.directory.missingEmergency },
              { value: "photo", label: t.directory.missingPhoto },
              { value: "location", label: t.directory.missingLocation },
            ]} />
          <FilterSelect id="sort" label={t.directory.sortLabel} value={filters.sort} all={null}
            options={[
              { value: "id", label: t.directory.sortId },
              { value: "name", label: t.directory.sortName },
              { value: "updated", label: t.directory.sortUpdated },
            ]} />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button type="submit" className={primaryButtonClass}><Icon name="search" className="size-4" /> {t.common.search}</button>
            {filtersActive && <Link href="/dashboard/students" className={buttonClass}>{t.common.clear}</Link>}
          </div>
        </form>
      </Panel>

      <Panel>
        {!result ? (
          <div role="alert" className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{t.directory.loadError}</p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">{t.directory.loadErrorDetail}</p>
          </div>
        ) : result.rows.length === 0 ? (
          filtersActive ? (
            <EmptyState title={t.directory.emptyFiltered} detail={t.directory.emptyFilteredDetail} />
          ) : (
            <EmptyState title={t.directory.emptyAll} detail={t.directory.emptyAllDetail} />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                    <th scope="col" className="px-4 py-3 font-medium">{t.directory.columns.student}</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">{t.directory.columns.id}</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">{t.directory.columns.gender} · {t.directory.columns.age}</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">{t.directory.columns.class}</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{t.directory.columns.guardian}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t.directory.columns.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const name = displayName(row.fullName, row.fullNameKm, lang);
                    const className = lang === "km" ? row.classNameKm ?? row.classNameEn : row.classNameEn;
                    const guardian = displayName(row.guardianNameEn, row.guardianNameKm, lang);
                    const age = row.dateOfBirth ? ageInYears(row.dateOfBirth, today) : null;
                    const incomplete = row.guardianCount === 0 || row.emergencyContactCount === 0;
                    return (
                      <tr key={row.studentId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/students/${encodeURIComponent(row.studentId)}`} className="flex items-center gap-3">
                            <StudentAvatar url={row.photoPath ? photoUrls[row.photoPath] : null} name={name.primary} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900 hover:text-violet-700 dark:text-slate-100 dark:hover:text-violet-300">{name.primary}</span>
                              {name.secondary && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{name.secondary}</span>}
                              <span className="block text-xs text-slate-500 dark:text-slate-400 md:hidden">{row.studentId}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 md:table-cell">{row.studentId}</td>
                        <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-300 md:table-cell">
                          {row.gender ? t.gender[row.gender as "female" | "male"] : "—"}
                          {age !== null && <span className="text-slate-400"> · {age}</span>}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-300 sm:table-cell">{className ?? <span className="text-slate-400">{t.directory.noClass}</span>}</td>
                        <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-300 lg:table-cell">
                          {row.guardianCount > 0 ? (
                            <>
                              <span className="block">{guardian.primary || "—"}</span>
                              {row.guardianPhone && <span className="block text-xs text-slate-500 dark:text-slate-400">{row.guardianPhone}</span>}
                            </>
                          ) : (
                            <span className="text-xs text-amber-800 dark:text-amber-300">{t.directory.missingGuardian}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} label={t.status[row.status]} />
                          {incomplete && <span className="mt-1 block text-[11px] text-amber-800 dark:text-amber-300">{t.directory.incomplete}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              <span>{format(t.directory.records, { n: result.total })} · {format(t.directory.pageOf, { page: result.page, pages: result.pages })}</span>
              <span className="flex gap-2">
                {result.page > 1 ? <Link href={pageHref(result.page - 1)} className={buttonClass}>{t.common.previous}</Link> : null}
                {result.page < result.pages ? <Link href={pageHref(result.page + 1)} className={buttonClass}>{t.common.next}</Link> : null}
              </span>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

function FilterSelect({
  id,
  label,
  value,
  all,
  options,
}: {
  id: string;
  label: string;
  value: string;
  all: string | null;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <select id={id} name={id} defaultValue={value} className={fieldClass}>
        {all !== null && <option value="">{all}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

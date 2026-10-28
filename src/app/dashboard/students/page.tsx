import Link from "next/link";
import { listStudents } from "@/lib/sis/student-records";

export const instant = false;

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  page?: string | string[];
}>;

const pageLinkClass =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:opacity-50 dark:border-white/15 dark:bg-[#19191f] dark:text-slate-200";

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = (firstValue(params.q) ?? "").trim().slice(0, 100);
  const statusValue = firstValue(params.status);
  const status =
    statusValue === "active" || statusValue === "inactive"
      ? statusValue
      : "all";
  const pageValue = Number(firstValue(params.page) ?? "1");
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0
      ? Math.min(pageValue, 1_000_000)
      : 1;
  let result;
  let loadError: string | null = null;

  try {
    result = await listStudents({ search, status, page });
  } catch (error) {
    console.error("Student directory page failed to load.", error);
    loadError =
      error instanceof Error
        ? error.message
        : "Student records could not be loaded.";
  }

  const pageCount = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;

  return (
    <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-violet-300 hover:text-violet-200"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Students</h1>
            <p className="mt-1 text-sm text-slate-400">
              Staff-only student directory
            </p>
          </div>
          <Link
            href="/dashboard/students/new"
            className="inline-flex min-h-10 items-center rounded-md bg-violet-700 px-4 text-sm font-medium text-white hover:bg-violet-600"
          >
            Add student
          </Link>
        </div>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#15151b]">
          <form
            action="/dashboard/students"
            className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
          >
            <label>
              <span className="sr-only">Search name or student ID</span>
              <input
                name="q"
                defaultValue={search}
                maxLength={100}
                placeholder="Search name or student ID"
                className="h-10 w-full rounded-md border border-white/15 bg-[#111116] px-3 text-sm text-white placeholder:text-slate-500"
              />
            </label>
            <label>
              <span className="sr-only">Enrollment status</span>
              <select
                name="status"
                defaultValue={status}
                className="h-10 w-full rounded-md border border-white/15 bg-[#111116] px-3 text-sm text-white"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button
              type="submit"
              className="h-10 rounded-md border border-white/15 px-4 text-sm hover:bg-white/[0.06]"
            >
              Search
            </button>
          </form>

          {loadError ? (
            <div role="alert" className="p-6">
              <h2 className="text-sm font-semibold text-rose-200">
                Student records are unavailable
              </h2>
              <p className="mt-2 text-sm text-slate-300">{loadError}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                No demo data was substituted. Confirm the student migration is
                installed and that your staff account is active.
              </p>
            </div>
          ) : result?.rows.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Enrollment status</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {result.rows.map((student) => (
                      <tr key={student.studentId}>
                        <td className="px-5 py-3">
                          <Link
                            href={`/dashboard/students/${encodeURIComponent(student.studentId)}`}
                            className="text-sm font-medium text-violet-300 hover:underline"
                          >
                            {student.fullName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {student.studentId}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-slate-300">
                          {student.enrollmentStatus}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(student.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                <p className="text-xs text-slate-400">
                  {result.total} records · page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <PageLink
                    search={search}
                    status={status}
                    page={page - 1}
                    disabled={page <= 1}
                  >
                    Previous
                  </PageLink>
                  <PageLink
                    search={search}
                    status={status}
                    page={page + 1}
                    disabled={page >= pageCount}
                  >
                    Next
                  </PageLink>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-slate-200">
                {search || status !== "all"
                  ? "No students match this search."
                  : "No student records yet."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Add a student using a school-assigned ID, or change the search.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PageLink({
  search,
  status,
  page,
  disabled,
  children,
}: {
  search: string;
  status: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status !== "all") params.set("status", status);
  params.set("page", String(page));

  return (
    <Link
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      href={`/dashboard/students?${params.toString()}`}
      className={`${pageLinkClass} ${disabled ? "pointer-events-none" : "hover:bg-white/[0.06]"}`}
    >
      {children}
    </Link>
  );
}

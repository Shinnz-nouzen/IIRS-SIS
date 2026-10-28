import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudent } from "@/lib/sis/student-records";

export const instant = false;

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  let student;

  try {
    student = await getStudent(studentId);
  } catch (error) {
    console.error("Student profile page failed to load.", error);
    return (
      <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
        <div
          role="alert"
          className="mx-auto max-w-3xl rounded-lg border border-rose-500/20 bg-[#15151b] p-6"
        >
          <h1 className="font-semibold text-rose-200">
            Student profile is unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {error instanceof Error
              ? error.message
              : "Student record could not be loaded."}
          </p>
          <Link
            href="/dashboard/students"
            className="mt-4 inline-block text-sm text-violet-300 hover:underline"
          >
            Return to the student directory
          </Link>
        </div>
      </main>
    );
  }

  if (!student) notFound();

  return (
    <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/students"
          className="text-xs text-violet-300 hover:text-violet-200"
        >
          ← Student directory
        </Link>
        <section className="mt-4 rounded-lg border border-white/10 bg-[#15151b] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-violet-300">
                {student.studentId}
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                {student.fullName}
              </h1>
            </div>
            <span className="rounded-md border border-white/10 px-3 py-1.5 text-xs capitalize text-slate-300">
              {student.enrollmentStatus}
            </span>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
            <Detail label="Student ID" value={student.studentId} />
            <Detail label="Full name" value={student.fullName} />
            <Detail label="Enrollment status" value={student.enrollmentStatus} />
            <Detail
              label="Created"
              value={new Date(student.createdAt).toLocaleString()}
            />
            <Detail
              label="Last updated"
              value={new Date(student.updatedAt).toLocaleString()}
            />
          </dl>
          <Link
            href={`/dashboard/students/${encodeURIComponent(student.studentId)}/edit`}
            className="mt-6 inline-flex min-h-10 items-center rounded-md bg-violet-700 px-4 text-sm font-medium hover:bg-violet-600"
          >
            Edit student
          </Link>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-200">{value}</dd>
    </div>
  );
}

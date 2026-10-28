import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudent } from "@/lib/sis/student-records";
import { StudentForm } from "../../student-form";

export const instant = false;

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  let student;

  try {
    student = await getStudent(studentId);
  } catch (error) {
    console.error("Student edit page failed to load.", error);
    return (
      <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
        <div role="alert" className="mx-auto max-w-2xl rounded-lg border border-rose-500/20 bg-[#15151b] p-6">
          <h1 className="font-semibold text-rose-200">Student record is unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">
            {error instanceof Error ? error.message : "Student record could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  if (!student) notFound();

  return (
    <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/dashboard/students/${encodeURIComponent(student.studentId)}`}
          className="text-xs text-violet-300 hover:text-violet-200"
        >
          ← Student profile
        </Link>
        <section className="mt-4 rounded-lg border border-white/10 bg-[#15151b] p-5 sm:p-7">
          <h1 className="text-xl font-semibold">Edit student</h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {student.studentId}
          </p>
          <div className="mt-6">
            <StudentForm student={student} />
          </div>
        </section>
      </div>
    </main>
  );
}

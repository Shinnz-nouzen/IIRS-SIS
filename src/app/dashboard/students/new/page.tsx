import Link from "next/link";
import { StudentForm } from "../student-form";

export const instant = false;

export default function NewStudentPage() {
  return (
    <main className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-100 sm:px-7">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/students"
          className="text-xs text-violet-300 hover:text-violet-200"
        >
          ← Student directory
        </Link>
        <section className="mt-4 rounded-lg border border-white/10 bg-[#15151b] p-5 sm:p-7">
          <h1 className="text-xl font-semibold">Add student</h1>
          <p className="mt-1 text-sm text-slate-400">
            The ID is entered manually because the school&apos;s official ID
            format has not been confirmed.
          </p>
          <div className="mt-6">
            <StudentForm />
          </div>
        </section>
      </div>
    </main>
  );
}

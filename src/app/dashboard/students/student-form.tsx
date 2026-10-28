"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveStudent } from "./actions";
import {
  initialStudentFormState,
  type StudentFormState,
} from "@/lib/sis/student-form-state";

type StudentFormValues = {
  studentId: string;
  fullName: string;
  enrollmentStatus: "active" | "inactive";
};

export function StudentForm({
  student,
}: {
  student?: StudentFormValues;
}) {
  const [state, action, pending] = useActionState<StudentFormState, FormData>(
    saveStudent,
    initialStudentFormState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.savedStudentId) {
      router.push(
        `/dashboard/students/${encodeURIComponent(state.savedStudentId)}`,
      );
      router.refresh();
    }
  }, [router, state.savedStudentId]);

  return (
    <form action={action} className="space-y-5">
      {student && (
        <input
          type="hidden"
          name="existingStudentId"
          value={student.studentId}
        />
      )}
      {!student && (
        <FieldError message={state.fieldErrors.studentId}>
          <label
            htmlFor="studentId"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Student ID
          </label>
          <input
            id="studentId"
            name="studentId"
            required
            maxLength={64}
            autoComplete="off"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter the school-assigned ID. No ID format is enforced.
          </p>
        </FieldError>
      )}
      {student && (
        <>
          <input type="hidden" name="studentId" value={student.studentId} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Student ID
            </label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
              {student.studentId}
            </p>
          </div>
        </>
      )}
      <FieldError message={state.fieldErrors.fullName}>
        <label
          htmlFor="fullName"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          maxLength={200}
          autoComplete="name"
          defaultValue={student?.fullName}
          className={inputClass}
        />
      </FieldError>
      <FieldError message={state.fieldErrors.enrollmentStatus}>
        <label
          htmlFor="enrollmentStatus"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Enrollment status
        </label>
        <select
          id="enrollmentStatus"
          name="enrollmentStatus"
          defaultValue={student?.enrollmentStatus ?? "active"}
          className={inputClass}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          Active/inactive is provisional pending confirmation of the school&apos;s
          official status vocabulary.
        </p>
      </FieldError>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
        >
          {state.error}
          {state.errorReference && (
            <span className="mt-1 block font-mono text-xs opacity-80">
              Reference: {state.errorReference}
            </span>
          )}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={() =>
            router.push(
              student
                ? `/dashboard/students/${encodeURIComponent(student.studentId)}`
                : "/dashboard/students",
            )
          }
          className={secondaryButtonClass}
          disabled={pending}
        >
          Cancel
        </button>
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Saving…" : student ? "Save changes" : "Add student"}
        </button>
      </div>
    </form>
  );
}

function FieldError({
  message,
  children,
}: {
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {message && (
        <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">
          {message}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-violet-500 dark:border-white/15 dark:bg-[#111116] dark:text-slate-100";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-violet-700 px-4 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-[#19191f] dark:text-slate-200 dark:hover:bg-white/[0.07]";

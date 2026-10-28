"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { StaffAuthorizationError } from "@/lib/auth/staff";
import {
  createStudent,
  StudentWriteError,
  updateStudent,
} from "@/lib/sis/student-records";
import {
  initialStudentFormState,
  type StudentFormState,
} from "@/lib/sis/student-form-state";
import { parseStudentInput } from "@/lib/sis/student-validation";

// A "use server" module may only export async functions. The form state type
// and initial value live in lib/sis/student-form-state.ts so the client form
// can import them without receiving a server-action reference proxy.

export async function saveStudent(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const { input, errors } = parseStudentInput(formData);
  const existingStudentId = formData.get("existingStudentId");

  if (Object.keys(errors).length > 0) {
    return {
      ...initialStudentFormState,
      error: "Review the highlighted fields.",
      fieldErrors: errors,
    };
  }

  if (
    existingStudentId !== null &&
    (typeof existingStudentId !== "string" ||
      existingStudentId.length === 0 ||
      existingStudentId.length > 64)
  ) {
    return {
      ...initialStudentFormState,
      error: "The student record identifier is invalid. Reload and try again.",
    };
  }

  try {
    const student = existingStudentId
      ? await updateStudent(existingStudentId, {
          fullName: input.fullName,
          enrollmentStatus: input.enrollmentStatus,
        })
      : await createStudent(input);

    revalidatePath("/dashboard/students");
    revalidatePath(`/dashboard/students/${encodeURIComponent(student.studentId)}`);
    return {
      ...initialStudentFormState,
      savedStudentId: student.studentId,
    };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof StaffAuthorizationError) {
      return {
        ...initialStudentFormState,
        error: "Your staff session is not authorized. Sign in again or contact an administrator.",
      };
    }

    if (error instanceof StudentWriteError) {
      return {
        ...initialStudentFormState,
        error: error.userMessage,
        errorReference: error.reference,
      };
    }

    console.error("Student save action failed unexpectedly.", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ...initialStudentFormState,
      error: "Student record could not be saved.",
    };
  }
}

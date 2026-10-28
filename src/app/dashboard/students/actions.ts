"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { StaffAuthorizationError } from "@/lib/auth/staff";
import {
  createStudent,
  updateStudent,
} from "@/lib/sis/student-records";
import { parseStudentInput } from "@/lib/sis/student-validation";

export type StudentFormState = {
  error: string | null;
  fieldErrors: {
    studentId?: string;
    fullName?: string;
    enrollmentStatus?: string;
  };
  savedStudentId: string | null;
};

export const initialStudentFormState: StudentFormState = {
  error: null,
  fieldErrors: {},
  savedStudentId: null,
};

export async function saveStudent(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const { input, errors } = parseStudentInput(formData);
  const existingStudentId = formData.get("existingStudentId");

  if (Object.keys(errors).length > 0) {
    return {
      error: "Review the highlighted fields.",
      fieldErrors: errors,
      savedStudentId: null,
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

    console.error("Student save action failed.", error);
    return {
      ...initialStudentFormState,
      error:
        error instanceof Error
          ? error.message
          : "Student record could not be saved.",
    };
  }
}

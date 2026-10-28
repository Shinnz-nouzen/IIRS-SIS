export type StudentStatus = "active" | "inactive";

export type StudentInput = {
  studentId: string;
  fullName: string;
  enrollmentStatus: StudentStatus;
};

export type StudentInputErrors = Partial<Record<keyof StudentInput, string>>;

export function validateStudentInput(
  input: StudentInput,
): StudentInputErrors {
  const errors: StudentInputErrors = {};

  if (!input.studentId || input.studentId.length > 64) {
    errors.studentId = "Enter a student ID using 1 to 64 characters.";
  } else if (input.studentId !== input.studentId.trim()) {
    errors.studentId = "Student ID cannot start or end with spaces.";
  }

  if (!input.fullName || input.fullName.length > 200) {
    errors.fullName = "Enter a name using 1 to 200 characters.";
  } else if (input.fullName !== input.fullName.trim()) {
    errors.fullName = "Name cannot start or end with spaces.";
  }

  if (input.enrollmentStatus !== "active" && input.enrollmentStatus !== "inactive") {
    errors.enrollmentStatus = "Choose active or inactive.";
  }

  return errors;
}

export function parseStudentInput(
  formData: FormData,
): { input: StudentInput; errors: StudentInputErrors } {
  const studentId = formData.get("studentId");
  const fullName = formData.get("fullName");
  const enrollmentStatus = formData.get("enrollmentStatus");

  const input: StudentInput = {
    studentId: typeof studentId === "string" ? studentId.trim() : "",
    fullName: typeof fullName === "string" ? fullName.trim() : "",
    enrollmentStatus:
      enrollmentStatus === "inactive" ? "inactive" : "active",
  };
  const errors = validateStudentInput(input);

  if (enrollmentStatus !== "active" && enrollmentStatus !== "inactive") {
    errors.enrollmentStatus = "Choose active or inactive.";
  }

  return { input, errors };
}

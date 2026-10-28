export type StudentFormState = {
  error: string | null;
  errorReference: string | null;
  fieldErrors: {
    studentId?: string;
    fullName?: string;
    enrollmentStatus?: string;
  };
  savedStudentId: string | null;
};

export const initialStudentFormState: StudentFormState = {
  error: null,
  errorReference: null,
  fieldErrors: {},
  savedStudentId: null,
};

export type EnrollmentStatus = "Active" | "Inactive" | "Pending";

export type Student = {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  guardian: string;
  classId: string;
  status: EnrollmentStatus;
  enrollmentDate: string;
  village: string;
  notes: string;
};

export type SchoolClass = {
  id: string;
  grade: string;
  section: string;
  room: string;
  teacher: string;
  shift: string;
};

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Excused"
  | "Missing"
  | "Unverified";

export type AttendanceRecord = {
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
};

export type GradeRecord = {
  id: string;
  studentId: string;
  subject: string;
  assessment: string;
  score: string;
  recordedOn: string;
};

export type DemoStaffMember = {
  name: string;
  email: string;
  role: "Administrator" | "Office Staff";
  status: "Active" | "Inactive";
};

export interface SisDataSource {
  listClasses(): Promise<readonly SchoolClass[]>;
  listAttendance(): Promise<readonly AttendanceRecord[]>;
  listGrades(): Promise<readonly GradeRecord[]>;
}

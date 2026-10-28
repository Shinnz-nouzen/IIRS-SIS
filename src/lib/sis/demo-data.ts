import type {
  AttendanceRecord,
  DemoStaffMember,
  GradeRecord,
  SchoolClass,
  SisDataSource,
} from "./types";

export const demoClasses: SchoolClass[] = [
  { id: "class-6-a", grade: "Grade 6", section: "A", room: "Room 06-A", teacher: "Morgan Lee", shift: "Morning" },
  { id: "class-7-a", grade: "Grade 7", section: "A", room: "Room 07-A", teacher: "Taylor Kim", shift: "Morning" },
  { id: "class-7-b", grade: "Grade 7", section: "B", room: "Room 07-B", teacher: "Jordan Reed", shift: "Afternoon" },
  { id: "class-8-a", grade: "Grade 8", section: "A", room: "Room 08-A", teacher: "Casey Morgan", shift: "Morning" },
  { id: "class-8-b", grade: "Grade 8", section: "B", room: "Room 08-B", teacher: "Riley Chen", shift: "Afternoon" },
  { id: "class-9-a", grade: "Grade 9", section: "A", room: "Room 09-A", teacher: "Avery Patel", shift: "Morning" },
];

export const demoAttendance: AttendanceRecord[] = [
  { studentId: "DEMO-24001", classId: "class-8-a", date: "2026-10-27", status: "Present" },
  { studentId: "DEMO-24002", classId: "class-7-b", date: "2026-10-27", status: "Present" },
  { studentId: "DEMO-24003", classId: "class-9-a", date: "2026-10-27", status: "Unverified" },
  { studentId: "DEMO-24004", classId: "class-8-b", date: "2026-10-27", status: "Absent" },
  { studentId: "DEMO-24005", classId: "class-6-a", date: "2026-10-27", status: "Excused" },
  { studentId: "DEMO-24006", classId: "class-7-a", date: "2026-10-27", status: "Late" },
  { studentId: "DEMO-24007", classId: "class-8-a", date: "2026-10-27", status: "Missing" },
  { studentId: "DEMO-24008", classId: "class-9-a", date: "2026-10-27", status: "Present" },
  { studentId: "DEMO-24009", classId: "class-7-b", date: "2026-10-27", status: "Missing" },
  { studentId: "DEMO-24010", classId: "class-8-b", date: "2026-10-27", status: "Present" },
  { studentId: "DEMO-24011", classId: "class-6-a", date: "2026-10-27", status: "Present" },
  { studentId: "DEMO-24012", classId: "class-7-a", date: "2026-10-27", status: "Unverified" },
];

export const demoGrades: GradeRecord[] = [
  { id: "grade-1", studentId: "DEMO-24001", subject: "Mathematics", assessment: "Sample quiz", score: "18 / 20", recordedOn: "2026-10-20" },
  { id: "grade-2", studentId: "DEMO-24001", subject: "Science", assessment: "Sample assignment", score: "15 / 20", recordedOn: "2026-10-22" },
  { id: "grade-3", studentId: "DEMO-24002", subject: "Mathematics", assessment: "Sample quiz", score: "16 / 20", recordedOn: "2026-10-20" },
  { id: "grade-4", studentId: "DEMO-24004", subject: "English", assessment: "Sample assessment", score: "17 / 20", recordedOn: "2026-10-21" },
  { id: "grade-5", studentId: "DEMO-24006", subject: "Science", assessment: "Sample assignment", score: "14 / 20", recordedOn: "2026-10-22" },
];

export const demoStaff: DemoStaffMember[] = [
  { name: "Taylor Admin", email: "admin.demo@example.invalid", role: "Administrator", status: "Active" },
  { name: "Riley Office", email: "office.demo@example.invalid", role: "Office Staff", status: "Active" },
  { name: "Casey Sample", email: "inactive.demo@example.invalid", role: "Office Staff", status: "Inactive" },
];

export const demoDataSource: SisDataSource = {
  async listClasses() {
    return demoClasses.map((schoolClass) => ({ ...schoolClass }));
  },
  async listAttendance() {
    return demoAttendance.map((record) => ({ ...record }));
  },
  async listGrades() {
    return demoGrades.map((record) => ({ ...record }));
  },
};

import "server-only";

import { requireActiveStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { StudentInput } from "./student-validation";

export type StudentRecord = StudentInput & {
  createdAt: string;
  updatedAt: string;
};

export type StudentPage = {
  rows: StudentRecord[];
  total: number;
  page: number;
  pageSize: number;
};

const studentColumns =
  "student_id, full_name, enrollment_status, created_at, updated_at";

function mapStudentRow(row: {
  student_id: string;
  full_name: string;
  enrollment_status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}): StudentRecord {
  return {
    studentId: row.student_id,
    fullName: row.full_name,
    enrollmentStatus: row.enrollment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapePostgrestValue(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll(",", "\\,")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

export async function listStudents({
  search,
  status,
  page,
}: {
  search: string;
  status: "all" | "active" | "inactive";
  page: number;
}): Promise<StudentPage> {
  await requireActiveStaff();
  const supabase = await createClient();
  const pageSize = 20;
  let query = supabase
    .from("students")
    .select(studentColumns, { count: "exact" })
    .order("student_id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    const filter = `"%${escapePostgrestValue(search)}%"`;
    query = query.or(
      `student_id.ilike.${filter},full_name.ilike.${filter}`,
    );
  }
  if (status !== "all") {
    query = query.eq("enrollment_status", status);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Student directory query failed.", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Student records could not be loaded.");
  }

  return {
    rows: data.map((row) => mapStudentRow(row)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getStudent(studentId: string): Promise<StudentRecord | null> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Student profile query failed.", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Student record could not be loaded.");
  }

  return data ? mapStudentRow(data) : null;
}

export async function createStudent(input: StudentInput): Promise<StudentRecord> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      student_id: input.studentId,
      full_name: input.fullName,
      enrollment_status: input.enrollmentStatus,
    })
    .select(studentColumns)
    .single();

  if (error) {
    console.error("Student create operation failed.", {
      code: error.code,
      message: error.message,
    });
    throw new Error(
      error.code === "23505"
        ? "That student ID is already in use."
        : "Student record could not be saved.",
    );
  }

  return mapStudentRow(data);
}

export async function updateStudent(
  studentId: string,
  input: Omit<StudentInput, "studentId">,
): Promise<StudentRecord> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update({
      full_name: input.fullName,
      enrollment_status: input.enrollmentStatus,
    })
    .eq("student_id", studentId)
    .select(studentColumns)
    .maybeSingle();

  if (error) {
    console.error("Student update operation failed.", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Student record could not be saved.");
  }

  if (!data) {
    throw new Error("Student record was not found or is no longer available.");
  }

  return mapStudentRow(data);
}

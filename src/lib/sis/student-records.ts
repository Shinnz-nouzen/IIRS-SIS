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

export class StudentWriteError extends Error {
  readonly reference: string;
  readonly userMessage: string;

  constructor(userMessage: string, reference: string) {
    super(userMessage);
    this.name = "StudentWriteError";
    this.userMessage = userMessage;
    this.reference = reference;
  }
}

type PostgrestFailure = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

// Logs the real database error (code/message/details/hint only: never the
// submitted student values) under a short reference that is also shown to the
// signed-in staff member, so a failure can be matched to a Vercel log line.
function failWrite(
  operation: "create" | "update",
  error: PostgrestFailure | null,
  fallbackMessage: string,
  userMessage: string,
): never {
  const reference = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`Student ${operation} failed [${reference}]`, {
    code: error?.code ?? null,
    message: error?.message ?? fallbackMessage,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
  throw new StudentWriteError(userMessage, reference);
}

function describeWriteFailure(
  operation: "create" | "update",
  error: PostgrestFailure,
): string {
  switch (error.code) {
    case "23505":
      return "That student ID is already in use.";
    case "23514":
      return "The database rejected the values. Check the student ID and name for leading or trailing spaces and length limits.";
    case "42501":
      return "The database denied this change (missing privilege or row-level security). An administrator needs to review the students table permissions.";
    case "42P01":
    case "PGRST205":
      return "The students table is not available to the application. An administrator needs to review the database setup.";
    case "42703":
    case "PGRST204":
      return "The students table does not match what the application expects. An administrator needs to review the database setup.";
    default:
      return operation === "create"
        ? "Student record could not be saved."
        : "Student record changes could not be saved.";
  }
}

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
    failWrite("create", error, "insert error", describeWriteFailure("create", error));
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
    failWrite("update", error, "update error", describeWriteFailure("update", error));
  }

  if (!data) {
    // PostgREST reports a row hidden or blocked by RLS as zero rows, not as an
    // error, so "missing" and "not permitted" cannot be told apart here.
    failWrite(
      "update",
      null,
      "update matched zero rows",
      "No student row was updated. The record may no longer exist, or the database did not allow this update for your account.",
    );
  }

  return mapStudentRow(data);
}

export type StudentCounts = { total: number; active: number; inactive: number };

export async function getStudentCounts(): Promise<StudentCounts> {
  await requireActiveStaff();
  const supabase = await createClient();
  const count = async (status?: "active" | "inactive") => {
    let query = supabase
      .from("students")
      .select("student_id", { count: "exact", head: true });
    if (status) query = query.eq("enrollment_status", status);
    const { count: total, error } = await query;
    if (error) {
      console.error("Student count query failed.", {
        code: error.code,
        message: error.message,
      });
      throw new Error("Student counts could not be loaded.");
    }
    return total ?? 0;
  };
  const [total, active, inactive] = await Promise.all([
    count(),
    count("active"),
    count("inactive"),
  ]);
  return { total, active, inactive };
}

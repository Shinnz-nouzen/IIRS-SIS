import "server-only";

import { requireActiveStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { failRead, failWrite } from "./errors";
import type { ClassData } from "./student-validation";

export type ClassRecord = {
  id: string;
  schoolYear: string;
  gradeLevel: string;
  section: string | null;
  nameEn: string;
  nameKm: string | null;
  isActive: boolean;
  studentCount: number;
};

type ClassRow = {
  id: string;
  school_year: string;
  grade_level: string;
  section: string | null;
  name_en: string;
  name_km: string | null;
  is_active: boolean;
};

const classColumns = "id, school_year, grade_level, section, name_en, name_km, is_active";

function mapClass(row: ClassRow, studentCount: number): ClassRecord {
  return {
    id: row.id,
    schoolYear: row.school_year,
    gradeLevel: row.grade_level,
    section: row.section,
    nameEn: row.name_en,
    nameKm: row.name_km,
    isActive: row.is_active,
    studentCount,
  };
}

export async function listClasses(): Promise<ClassRecord[]> {
  await requireActiveStaff();
  const supabase = await createClient();
  const [classes, current] = await Promise.all([
    supabase
      .from("classes")
      .select(classColumns)
      .order("school_year", { ascending: false })
      .order("grade_level", { ascending: true })
      .order("name_en", { ascending: true }),
    supabase.from("student_enrollments").select("class_id").is("left_on", null),
  ]);
  if (classes.error) failRead("class list", classes.error, "Classes could not be loaded.");
  if (current.error) failRead("class counts", current.error, "Classes could not be loaded.");

  const counts = new Map<string, number>();
  for (const row of current.data) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }
  return (classes.data as ClassRow[]).map((row) => mapClass(row, counts.get(row.id) ?? 0));
}

export type ClassOption = {
  id: string;
  schoolYear: string;
  nameEn: string;
  nameKm: string | null;
  isActive: boolean;
};

export async function listClassOptions(): Promise<ClassOption[]> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, school_year, name_en, name_km, is_active")
    .order("school_year", { ascending: false })
    .order("name_en", { ascending: true });
  if (error) failRead("class options", error, "Classes could not be loaded.");
  return data.map((row) => ({
    id: row.id as string,
    schoolYear: row.school_year as string,
    nameEn: row.name_en as string,
    nameKm: row.name_km as string | null,
    isActive: row.is_active as boolean,
  }));
}

export async function createClassRecord(input: ClassData): Promise<string> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({
      school_year: input.schoolYear,
      grade_level: input.gradeLevel,
      section: input.section,
      name_en: input.nameEn,
      name_km: input.nameKm,
      is_active: input.isActive,
    })
    .select("id")
    .single();
  if (error) failWrite("class create", error, "insert error");
  return data.id as string;
}

export async function updateClassRecord(
  id: string,
  input: Omit<ClassData, "schoolYear">,
): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .update({
      grade_level: input.gradeLevel,
      section: input.section,
      name_en: input.nameEn,
      name_km: input.nameKm,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) failWrite("class update", error, "update error");
  if (!data) failWrite("class update", null, "update matched zero rows");
}

import "server-only";

import { requireActiveStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { failRead, failWrite } from "./errors";
import { PHOTO_BUCKET, isSafePhotoPath, type PhotoType } from "./photo";
import { escapeLikePattern } from "./search-escape";
import {
  MAX_RELATED_ROWS,
  type ContactData,
  type GuardianData,
  type StudentCoreData,
  type StudentStatus,
} from "./student-validation";

export const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------
export type DirectoryFilters = {
  search: string;
  status: string;
  gender: string;
  classId: string; // uuid | "none" | ""
  missing: string; // guardian | emergency | photo | location | ""
  sort: string; // id | name | updated
  page: number;
};

export type DirectoryRow = {
  studentId: string;
  fullName: string;
  fullNameKm: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  status: StudentStatus;
  photoPath: string | null;
  classNameEn: string | null;
  classNameKm: string | null;
  guardianNameEn: string | null;
  guardianNameKm: string | null;
  guardianPhone: string | null;
  guardianCount: number;
  emergencyContactCount: number;
  hasLocation: boolean;
};

export type DirectoryPage = {
  rows: DirectoryRow[];
  total: number;
  page: number;
  pages: number;
};

type DirectoryDbRow = {
  student_id: string;
  full_name: string;
  full_name_km: string | null;
  gender: string | null;
  date_of_birth: string | null;
  enrollment_status: StudentStatus;
  photo_path: string | null;
  class_name_en: string | null;
  class_name_km: string | null;
  guardian_name_en: string | null;
  guardian_name_km: string | null;
  guardian_phone: string | null;
  guardian_count: number;
  emergency_contact_count: number;
  has_location: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function quoteFilterValue(value: string): string {
  // PostgREST `or=` values: wrap in double quotes, escape \ and ".
  return `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

// Phone numbers are stored normalised (+85512345678 or 012345678). Searching by
// the national part ("12345678") finds both spellings.
export function phoneNeedle(search: string): string | null {
  if (!/^[+\d\s().-]+$/.test(search)) return null;
  let digits = search.replace(/\D/g, "");
  if (search.trim().startsWith("+855") || digits.startsWith("855")) digits = digits.replace(/^855/, "");
  digits = digits.replace(/^0+/, "");
  return digits.length >= 3 ? digits : null;
}

export async function listStudents(filters: DirectoryFilters): Promise<DirectoryPage> {
  await requireActiveStaff();
  const supabase = await createClient();

  const buildQuery = () => {
    let query = supabase.from("student_directory").select(
      "student_id, full_name, full_name_km, gender, date_of_birth, enrollment_status, photo_path, class_name_en, class_name_km, guardian_name_en, guardian_name_km, guardian_phone, guardian_count, emergency_contact_count, has_location",
      { count: "exact" },
    );

    const search = filters.search.trim();
    if (search) {
      const like = `%${escapeLikePattern(search)}%`;
      const clauses = [
        `student_id.ilike.${quoteFilterValue(like)}`,
        `full_name.ilike.${quoteFilterValue(like)}`,
        `full_name_km.ilike.${quoteFilterValue(like)}`,
        `guardian_name_en.ilike.${quoteFilterValue(like)}`,
        `guardian_name_km.ilike.${quoteFilterValue(like)}`,
      ];
      const needle = phoneNeedle(search);
      if (needle) clauses.push(`phones.ilike.${quoteFilterValue(`%${needle}%`)}`);
      query = query.or(clauses.join(","));
    }
    if (filters.status) query = query.eq("enrollment_status", filters.status);
    if (filters.gender) query = query.eq("gender", filters.gender);
    if (filters.classId === "none") query = query.is("class_id", null);
    else if (uuidPattern.test(filters.classId)) query = query.eq("class_id", filters.classId);
    if (filters.missing === "guardian") query = query.eq("guardian_count", 0);
    if (filters.missing === "emergency") query = query.eq("emergency_contact_count", 0);
    if (filters.missing === "photo") query = query.is("photo_path", null);
    if (filters.missing === "location") query = query.eq("has_location", false);

    if (filters.sort === "name") {
      query = query.order("full_name", { ascending: true }).order("student_id", { ascending: true });
    } else if (filters.sort === "updated") {
      query = query.order("updated_at", { ascending: false }).order("student_id", { ascending: true });
    } else {
      query = query.order("student_id", { ascending: true });
    }
    return query;
  };

  const fetchPage = (page: number) => {
    const from = (page - 1) * PAGE_SIZE;
    return buildQuery().range(from, from + PAGE_SIZE - 1);
  };

  let page = Math.max(1, Math.floor(filters.page) || 1);
  let result = await fetchPage(page);

  // PostgREST answers 416 (PGRST103) when the offset is past the last row, e.g.
  // a stale "?page=3" after filters shrank the list. Show the last page instead.
  if (result.error?.code === "PGRST103") {
    const first = await fetchPage(1);
    if (first.error) failRead("directory", first.error, "Student records could not be loaded.");
    const lastPage = Math.max(1, Math.ceil((first.count ?? 0) / PAGE_SIZE));
    page = lastPage;
    result = lastPage === 1 ? first : await fetchPage(lastPage);
  }
  const { data, error, count } = result;
  if (error) failRead("directory", error, "Student records could not be loaded.");

  const total = count ?? 0;
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: (data as DirectoryDbRow[]).map((row) => ({
      studentId: row.student_id,
      fullName: row.full_name,
      fullNameKm: row.full_name_km,
      gender: row.gender,
      dateOfBirth: row.date_of_birth,
      status: row.enrollment_status,
      photoPath: row.photo_path,
      classNameEn: row.class_name_en,
      classNameKm: row.class_name_km,
      guardianNameEn: row.guardian_name_en,
      guardianNameKm: row.guardian_name_km,
      guardianPhone: row.guardian_phone,
      guardianCount: row.guardian_count,
      emergencyContactCount: row.emergency_contact_count,
      hasLocation: row.has_location,
    })),
  };
}

export type StudentCounts = { total: number; active: number };

export async function getStudentCounts(): Promise<StudentCounts> {
  await requireActiveStaff();
  const supabase = await createClient();
  const [total, active] = await Promise.all([
    supabase.from("students").select("student_id", { count: "exact", head: true }),
    supabase
      .from("students")
      .select("student_id", { count: "exact", head: true })
      .eq("enrollment_status", "active"),
  ]);
  if (total.error) failRead("count total", total.error, "Student totals could not be loaded.");
  if (active.error) failRead("count active", active.error, "Student totals could not be loaded.");
  return { total: total.count ?? 0, active: active.count ?? 0 };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export type Guardian = {
  id: string;
  relationship: string;
  fullNameEn: string | null;
  fullNameKm: string | null;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  occupation: string | null;
  isPrimary: boolean;
  livesWithStudent: boolean | null;
};

export type EmergencyContact = {
  id: string;
  fullNameEn: string | null;
  fullNameKm: string | null;
  relationship: string;
  phone: string;
  phoneAlt: string | null;
  priority: number;
};

export type Enrollment = {
  id: string;
  classId: string;
  classNameEn: string;
  classNameKm: string | null;
  gradeLevel: string;
  schoolYear: string;
  enrolledOn: string;
  leftOn: string | null;
};

export type StudentProfile = {
  studentId: string;
  fullName: string;
  fullNameKm: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  admissionDate: string | null;
  status: StudentStatus;
  photoPath: string | null;
  addressLine: string | null;
  village: string | null;
  commune: string | null;
  district: string | null;
  province: string | null;
  addressNotes: string | null;
  homeLatitude: number | null;
  homeLongitude: number | null;
  createdAt: string;
  updatedAt: string;
  enrollments: Enrollment[];
  guardians: Guardian[];
  contacts: EmergencyContact[];
};

const studentColumns =
  "student_id, full_name, full_name_km, date_of_birth, gender, place_of_birth, nationality, admission_date, enrollment_status, photo_path, address_line, village, commune, district, province, address_notes, home_latitude, home_longitude, created_at, updated_at";

export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  await requireActiveStaff();
  const supabase = await createClient();

  const [student, enrollments, guardians, contacts] = await Promise.all([
    supabase.from("students").select(studentColumns).eq("student_id", studentId).maybeSingle(),
    supabase
      .from("student_enrollments")
      .select("id, class_id, enrolled_on, left_on, classes(name_en, name_km, grade_level, school_year)")
      .eq("student_id", studentId)
      .order("enrolled_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("student_guardians")
      .select(
        "id, relationship, full_name_en, full_name_km, phone, phone_alt, email, occupation, is_primary, lives_with_student",
      )
      .eq("student_id", studentId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("student_emergency_contacts")
      .select("id, full_name_en, full_name_km, relationship, phone, phone_alt, priority")
      .eq("student_id", studentId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (student.error) failRead("profile", student.error, "The student could not be loaded.");
  if (enrollments.error) failRead("profile enrollments", enrollments.error, "The student could not be loaded.");
  if (guardians.error) failRead("profile guardians", guardians.error, "The student could not be loaded.");
  if (contacts.error) failRead("profile contacts", contacts.error, "The student could not be loaded.");
  if (!student.data) return null;

  const s = student.data as Record<string, unknown>;
  const text = (key: string) => (s[key] as string | null) ?? null;

  type EnrollmentDb = {
    id: string;
    class_id: string;
    enrolled_on: string;
    left_on: string | null;
    classes: { name_en: string; name_km: string | null; grade_level: string; school_year: string } | null;
  };

  return {
    studentId: s.student_id as string,
    fullName: s.full_name as string,
    fullNameKm: text("full_name_km"),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender"),
    placeOfBirth: text("place_of_birth"),
    nationality: text("nationality"),
    admissionDate: text("admission_date"),
    status: s.enrollment_status as StudentStatus,
    photoPath: text("photo_path"),
    addressLine: text("address_line"),
    village: text("village"),
    commune: text("commune"),
    district: text("district"),
    province: text("province"),
    addressNotes: text("address_notes"),
    homeLatitude: s.home_latitude === null ? null : Number(s.home_latitude),
    homeLongitude: s.home_longitude === null ? null : Number(s.home_longitude),
    createdAt: s.created_at as string,
    updatedAt: s.updated_at as string,
    enrollments: (enrollments.data as unknown as EnrollmentDb[]).map((row) => ({
      id: row.id,
      classId: row.class_id,
      classNameEn: row.classes?.name_en ?? "",
      classNameKm: row.classes?.name_km ?? null,
      gradeLevel: row.classes?.grade_level ?? "",
      schoolYear: row.classes?.school_year ?? "",
      enrolledOn: row.enrolled_on,
      leftOn: row.left_on,
    })),
    guardians: guardians.data.map((row) => ({
      id: row.id as string,
      relationship: row.relationship as string,
      fullNameEn: row.full_name_en as string | null,
      fullNameKm: row.full_name_km as string | null,
      phone: row.phone as string,
      phoneAlt: row.phone_alt as string | null,
      email: row.email as string | null,
      occupation: row.occupation as string | null,
      isPrimary: row.is_primary as boolean,
      livesWithStudent: row.lives_with_student as boolean | null,
    })),
    contacts: contacts.data.map((row) => ({
      id: row.id as string,
      fullNameEn: row.full_name_en as string | null,
      fullNameKm: row.full_name_km as string | null,
      relationship: row.relationship as string,
      phone: row.phone as string,
      phoneAlt: row.phone_alt as string | null,
      priority: row.priority as number,
    })),
  };
}

// ---------------------------------------------------------------------------
// Photos (private bucket; read through short-lived signed URLs)
// ---------------------------------------------------------------------------
export async function getPhotoUrls(paths: (string | null)[]): Promise<Record<string, string>> {
  await requireActiveStaff();
  const safe = [...new Set(paths.filter((p): p is string => !!p && isSafePhotoPath(p)))];
  if (safe.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(safe, 60 * 60);
  if (error || !data) {
    console.error("Photo URL signing failed", { message: error?.message ?? "no data" });
    return {};
  }
  const urls: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  return urls;
}

export async function storePhoto(bytes: Uint8Array, type: PhotoType): Promise<string> {
  await requireActiveStaff();
  const supabase = await createClient();
  const path = `${crypto.randomUUID()}.${type.ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: type.mime, upsert: false });
  if (error) {
    console.error("Photo upload failed", { message: error.message });
    failWrite("photo upload", null, "storage error", "photoUpload");
  }
  return path;
}

export async function removePhoto(path: string | null): Promise<void> {
  if (!path || !isSafePhotoPath(path)) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    if (error) console.error("Photo cleanup failed", { message: error.message });
  } catch (error) {
    console.error("Photo cleanup failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
function studentColumnsPayload(core: StudentCoreData, photoPath: string | null) {
  return {
    full_name: core.fullName,
    full_name_km: core.fullNameKm,
    date_of_birth: core.dateOfBirth,
    gender: core.gender,
    place_of_birth: core.placeOfBirth,
    nationality: core.nationality,
    admission_date: core.admissionDate,
    enrollment_status: core.enrollmentStatus,
    photo_path: photoPath,
    address_line: core.addressLine,
    village: core.village,
    commune: core.commune,
    district: core.district,
    province: core.province,
    address_notes: core.addressNotes,
    home_latitude: core.homeLatitude,
    home_longitude: core.homeLongitude,
  };
}

export async function createStudent(input: {
  core: StudentCoreData;
  guardian: GuardianData | null;
  contact: ContactData | null;
  classId: string | null;
  photoPath: string | null;
}): Promise<string> {
  await requireActiveStaff();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("register_student", {
    p_student: { student_id: input.core.studentId, ...studentColumnsPayload(input.core, input.photoPath) },
    p_guardian: input.guardian && {
      relationship: input.guardian.relationship,
      full_name_en: input.guardian.fullNameEn,
      full_name_km: input.guardian.fullNameKm,
      phone: input.guardian.phone,
      phone_alt: input.guardian.phoneAlt,
      email: input.guardian.email,
      occupation: input.guardian.occupation,
      lives_with_student:
        input.guardian.livesWithStudent === null ? null : String(input.guardian.livesWithStudent),
    },
    p_contact: input.contact && {
      full_name_en: input.contact.fullNameEn,
      full_name_km: input.contact.fullNameKm,
      relationship: input.contact.relationship,
      phone: input.contact.phone,
      phone_alt: input.contact.phoneAlt,
    },
    p_class_id: input.classId,
  });

  if (error) {
    await removePhoto(input.photoPath);
    failWrite("student register", error, "register_student error");
  }
  return data as string;
}

export async function updateStudentCore(
  studentId: string,
  core: StudentCoreData,
  photoPath: string | null,
): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update(studentColumnsPayload(core, photoPath))
    .eq("student_id", studentId)
    .select("student_id")
    .maybeSingle();
  if (error) failWrite("student update", error, "update error");
  if (!data) failWrite("student update", null, "update matched zero rows");
}

export async function getPhotoPath(studentId: string): Promise<string | null> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("photo_path")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) failRead("photo path", error, "The student could not be loaded.");
  return (data?.photo_path as string | null) ?? null;
}

async function relatedCount(table: string, studentId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  if (error) failWrite(`${table} count`, error, "count error");
  return count ?? 0;
}

export async function saveGuardian(
  studentId: string,
  guardianId: string | null,
  input: GuardianData,
): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const payload = {
    relationship: input.relationship,
    full_name_en: input.fullNameEn,
    full_name_km: input.fullNameKm,
    phone: input.phone,
    phone_alt: input.phoneAlt,
    email: input.email,
    occupation: input.occupation,
    is_primary: input.isPrimary,
    lives_with_student: input.livesWithStudent,
  };
  if (guardianId) {
    const { data, error } = await supabase
      .from("student_guardians")
      .update(payload)
      .eq("id", guardianId)
      .eq("student_id", studentId)
      .select("id")
      .maybeSingle();
    if (error) failWrite("guardian update", error, "update error");
    if (!data) failWrite("guardian update", null, "update matched zero rows");
    return;
  }
  if ((await relatedCount("student_guardians", studentId)) >= MAX_RELATED_ROWS) {
    failWrite("guardian create", null, "limit reached", "limitReached");
  }
  const { error } = await supabase
    .from("student_guardians")
    .insert({ student_id: studentId, ...payload });
  if (error) failWrite("guardian create", error, "insert error");
}

export async function deleteGuardian(studentId: string, guardianId: string): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("id", guardianId)
    .eq("student_id", studentId)
    .select("id");
  if (error) failWrite("guardian delete", error, "delete error");
  if (!data || data.length === 0) failWrite("guardian delete", null, "delete matched zero rows");
}

export async function saveContact(
  studentId: string,
  contactId: string | null,
  input: ContactData,
): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const payload = {
    full_name_en: input.fullNameEn,
    full_name_km: input.fullNameKm,
    relationship: input.relationship,
    phone: input.phone,
    phone_alt: input.phoneAlt,
    priority: input.priority,
  };
  if (contactId) {
    const { data, error } = await supabase
      .from("student_emergency_contacts")
      .update(payload)
      .eq("id", contactId)
      .eq("student_id", studentId)
      .select("id")
      .maybeSingle();
    if (error) failWrite("contact update", error, "update error");
    if (!data) failWrite("contact update", null, "update matched zero rows");
    return;
  }
  if ((await relatedCount("student_emergency_contacts", studentId)) >= MAX_RELATED_ROWS) {
    failWrite("contact create", null, "limit reached", "limitReached");
  }
  const { error } = await supabase
    .from("student_emergency_contacts")
    .insert({ student_id: studentId, ...payload });
  if (error) failWrite("contact create", error, "insert error");
}

export async function deleteContact(studentId: string, contactId: string): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_emergency_contacts")
    .delete()
    .eq("id", contactId)
    .eq("student_id", studentId)
    .select("id");
  if (error) failWrite("contact delete", error, "delete error");
  if (!data || data.length === 0) failWrite("contact delete", null, "delete matched zero rows");
}

export async function assignClass(studentId: string, classId: string, on: string): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_student_class", {
    p_student_id: studentId,
    p_class_id: classId,
    p_on: on,
  });
  if (error) failWrite("class assign", error, "assign_student_class error");
}

export async function endEnrollment(studentId: string, on: string): Promise<void> {
  await requireActiveStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("end_student_enrollment", {
    p_student_id: studentId,
    p_on: on,
  });
  if (error) failWrite("class end", error, "end_student_enrollment error");
  if (!data) failWrite("class end", null, "no current enrollment");
}

// ---------------------------------------------------------------------------
// Language preference
// ---------------------------------------------------------------------------
export async function readLanguagePreference(userId: string): Promise<"en" | "km" | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff_preferences")
      .select("language")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.language === "km" || data.language === "en" ? data.language : null;
  } catch {
    return null;
  }
}

export async function writeLanguagePreference(userId: string, language: "en" | "km"): Promise<void> {
  // Not an upsert: ON CONFLICT DO UPDATE would also SET user_id, which is (by
  // design) not an updatable column. Update first, insert when no row exists.
  const supabase = await createClient();
  const updated = await supabase
    .from("staff_preferences")
    .update({ language })
    .eq("user_id", userId)
    .select("user_id");
  if (updated.error) {
    console.error("Language preference save failed", { code: updated.error.code ?? null });
    return;
  }
  if (updated.data.length > 0) return;
  const inserted = await supabase.from("staff_preferences").insert({ user_id: userId, language });
  if (inserted.error) {
    console.error("Language preference save failed", { code: inserted.error.code ?? null });
  }
}

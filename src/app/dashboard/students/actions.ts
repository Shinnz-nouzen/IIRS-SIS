"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveStaff } from "@/lib/auth/staff";
import { failureState, isUuid, reviewState, savedState } from "@/lib/sis/action-helpers";
import type { FormState } from "@/lib/sis/form-state";
import { PHOTO_MAX_BYTES, detectPhotoType, type PhotoType } from "@/lib/sis/photo";
import {
  assignClass,
  createStudent,
  deleteContact,
  deleteGuardian,
  endEnrollment,
  getPhotoPath,
  removePhoto,
  saveContact,
  saveGuardian,
  storePhoto,
  updateStudentCore,
} from "@/lib/sis/student-records";
import {
  LIMITS,
  formGetter,
  parseContact,
  parseEffectiveDate,
  parseGuardian,
  parseStudentCore,
  type ErrorCode,
  type FieldErrors,
} from "@/lib/sis/student-validation";

// Validates an uploaded photo against size and real content type. Returns the
// bytes to store, or an error code. An empty file input means "no photo change".
async function readPhoto(
  formData: FormData,
): Promise<
  | { kind: "none" }
  | { kind: "ok"; bytes: Uint8Array; type: PhotoType }
  | { kind: "error"; code: ErrorCode }
> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { kind: "none" };
  if (file.size > PHOTO_MAX_BYTES) return { kind: "error", code: "photoSize" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectPhotoType(bytes);
  if (!type) return { kind: "error", code: "photoType" };
  return { kind: "ok", bytes, type };
}

function pickClassId(raw: string): string | null {
  return isUuid(raw) ? raw : null;
}

export async function createStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  let values: Record<string, string> = {};
  let uploadedPath: string | null = null;
  let createdId: string | null = null;

  try {
    await requireActiveStaff();

    const core = parseStudentCore(get, { mode: "create" });
    const guardian = parseGuardian(get, "guardian", { optional: true });
    const contact = parseContact(get, "contact", { optional: true });
    const classRaw = get("classId");
    values = { ...core.values, ...guardian.values, ...contact.values, classId: classRaw };

    const fieldErrors: FieldErrors = { ...core.errors, ...guardian.errors, ...contact.errors };
    if (classRaw !== "" && !isUuid(classRaw)) fieldErrors.classId = "invalidChoice";
    const photo = await readPhoto(formData);
    if (photo.kind === "error") fieldErrors.photo = photo.code;

    if (Object.values(fieldErrors).some(Boolean) || !core.data) {
      return reviewState(values, fieldErrors);
    }

    if (photo.kind === "ok") uploadedPath = await storePhoto(photo.bytes, photo.type);
    createdId = await createStudent({
      core: core.data,
      guardian: guardian.data,
      contact: contact.data,
      classId: pickClassId(classRaw),
      photoPath: uploadedPath,
    });
  } catch (error) {
    // createStudent already removes the photo it was handed when the RPC fails;
    // this covers failures between the upload and the RPC.
    if (uploadedPath && !createdId) await removePhoto(uploadedPath);
    return failureState(error, values);
  }

  revalidatePath("/dashboard/students");
  redirect(`/dashboard/students/${encodeURIComponent(createdId)}?created=1`);
}

export async function updateStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("originalStudentId").trim();
  let values: Record<string, string> = {};
  let newPath: string | null = null;
  let done = false;

  try {
    await requireActiveStaff();
    if (!studentId || studentId.length > LIMITS.studentId) {
      return failureState(new Error("missing student id"), values);
    }

    const core = parseStudentCore(get, { mode: "update" });
    values = { ...core.values, studentId };
    const fieldErrors: FieldErrors = { ...core.errors };
    const photo = await readPhoto(formData);
    if (photo.kind === "error") fieldErrors.photo = photo.code;
    if (Object.values(fieldErrors).some(Boolean) || !core.data) {
      return reviewState(values, fieldErrors);
    }

    const oldPath = await getPhotoPath(studentId);
    let nextPath = oldPath;
    if (photo.kind === "ok") {
      newPath = await storePhoto(photo.bytes, photo.type);
      nextPath = newPath;
    } else if (get("removePhoto") === "on") {
      nextPath = null;
    }

    await updateStudentCore(studentId, core.data, nextPath);
    done = true;
    if (oldPath && oldPath !== nextPath) await removePhoto(oldPath);
  } catch (error) {
    if (newPath && !done) await removePhoto(newPath);
    return failureState(error, values);
  }

  revalidatePath("/dashboard/students");
  redirect(`/dashboard/students/${encodeURIComponent(studentId)}?saved=1`);
}

export async function saveGuardianAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  const guardianId = get("guardianId").trim();
  let values: Record<string, string> = {};
  try {
    await requireActiveStaff();
    const parsed = parseGuardian(get, "guardian", { optional: false });
    values = parsed.values;
    if (!studentId || (guardianId && !isUuid(guardianId))) return failureState(new Error("bad id"), values);
    if (!parsed.data) return reviewState(values, parsed.errors);
    await saveGuardian(studentId, guardianId || null, parsed.data);
  } catch (error) {
    return failureState(error, values);
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, guardianId || "new");
}

export async function deleteGuardianAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  const guardianId = get("guardianId").trim();
  try {
    await requireActiveStaff();
    if (!studentId || !isUuid(guardianId)) return failureState(new Error("bad id"), {});
    await deleteGuardian(studentId, guardianId);
  } catch (error) {
    return failureState(error, {});
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, guardianId);
}

export async function saveContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  const contactId = get("contactId").trim();
  let values: Record<string, string> = {};
  try {
    await requireActiveStaff();
    const parsed = parseContact(get, "contact", { optional: false });
    values = parsed.values;
    if (!studentId || (contactId && !isUuid(contactId))) return failureState(new Error("bad id"), values);
    if (!parsed.data) return reviewState(values, parsed.errors);
    await saveContact(studentId, contactId || null, parsed.data);
  } catch (error) {
    return failureState(error, values);
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, contactId || "new");
}

export async function deleteContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  const contactId = get("contactId").trim();
  try {
    await requireActiveStaff();
    if (!studentId || !isUuid(contactId)) return failureState(new Error("bad id"), {});
    await deleteContact(studentId, contactId);
  } catch (error) {
    return failureState(error, {});
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, contactId);
}

export async function assignClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  const classId = get("classId").trim();
  const values = { classId, effectiveOn: get("effectiveOn") };
  try {
    await requireActiveStaff();
    if (!studentId) return failureState(new Error("bad id"), values);
    const fieldErrors: FieldErrors = {};
    if (!isUuid(classId)) fieldErrors.classId = classId ? "invalidChoice" : "required";
    const date = parseEffectiveDate(get("effectiveOn"));
    if (date.error) fieldErrors.effectiveOn = date.error;
    if (Object.values(fieldErrors).some(Boolean)) return reviewState(values, fieldErrors);
    await assignClass(studentId, classId, date.value);
  } catch (error) {
    return failureState(error, values);
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, classId);
}

export async function endEnrollmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const studentId = get("studentId").trim();
  try {
    await requireActiveStaff();
    if (!studentId) return failureState(new Error("bad id"), {});
    const date = parseEffectiveDate(get("effectiveOn"));
    if (date.error) return reviewState({ effectiveOn: get("effectiveOn") }, { effectiveOn: date.error });
    await endEnrollment(studentId, date.value);
  } catch (error) {
    return failureState(error, {});
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return savedState({}, studentId);
}

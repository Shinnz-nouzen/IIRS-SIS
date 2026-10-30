"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStaff } from "@/lib/auth/staff";
import { failureState, isUuid, reviewState, savedState } from "@/lib/sis/action-helpers";
import { createClassRecord, updateClassRecord } from "@/lib/sis/class-records";
import type { FormState } from "@/lib/sis/form-state";
import { formGetter, parseClass } from "@/lib/sis/student-validation";

export async function saveClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const get = formGetter(formData);
  const classId = get("classId").trim();
  const mode = classId ? "update" : "create";
  let values: Record<string, string> = {};
  try {
    await requireActiveStaff();
    const parsed = parseClass(get, { mode });
    values = parsed.values;
    if (classId && !isUuid(classId)) return failureState(new Error("bad id"), values);
    if (!parsed.data) return reviewState(values, parsed.errors);
    if (classId) {
      const { schoolYear: _ignored, ...rest } = parsed.data;
      void _ignored;
      await updateClassRecord(classId, rest);
    } else {
      await createClassRecord(parsed.data);
    }
  } catch (error) {
    return failureState(error, values);
  }
  revalidatePath("/dashboard/classes");
  return savedState({}, classId || "new");
}

import "server-only";

import { unstable_rethrow } from "next/navigation";
import { StaffAuthorizationError } from "@/lib/auth/staff";
import { RecordReadError, RecordWriteError } from "./errors";
import type { FormState } from "./form-state";
import type { FieldErrors } from "./student-validation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function failureState(
  error: unknown,
  values: Record<string, string>,
  fieldErrors: FieldErrors = {},
): FormState {
  unstable_rethrow(error);
  if (error instanceof RecordWriteError) {
    return { errorKey: error.errorKey, reference: error.reference, fieldErrors, values, savedId: null, savedAt: null };
  }
  if (error instanceof StaffAuthorizationError) {
    return { errorKey: "unauthorized", reference: null, fieldErrors, values, savedId: null, savedAt: null };
  }
  const reference = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`Student module action failed [${reference}]`, {
    name: error instanceof Error ? error.name : "unknown",
    read: error instanceof RecordReadError,
  });
  return { errorKey: "generic", reference, fieldErrors, values, savedId: null, savedAt: null };
}

export function reviewState(values: Record<string, string>, fieldErrors: FieldErrors): FormState {
  return { errorKey: "review", reference: null, fieldErrors, values, savedId: null, savedAt: null };
}

export function savedState(values: Record<string, string>, savedId: string | null): FormState {
  return { errorKey: null, reference: null, fieldErrors: {}, values, savedId, savedAt: Date.now() };
}

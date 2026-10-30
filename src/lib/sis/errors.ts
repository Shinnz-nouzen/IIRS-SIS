import type { DbErrorKey } from "./form-state";

export type PostgrestFailure = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export class RecordWriteError extends Error {
  readonly errorKey: DbErrorKey;
  readonly reference: string;

  constructor(errorKey: DbErrorKey, reference: string) {
    super(errorKey);
    this.name = "RecordWriteError";
    this.errorKey = errorKey;
    this.reference = reference;
  }
}

export class RecordReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordReadError";
  }
}

// Only constraint / permission / schema-cache messages are safe to log: they
// name constraints and relations. Messages for other classes (for example
// "invalid input syntax for type date: \"…\"") can echo what the user typed, and
// `details` of a check violation contains the whole failing row. Neither is
// logged, so personal data never reaches the hosting provider's logs.
function safeMessage(error: PostgrestFailure | null, fallback: string): string {
  const code = error?.code ?? "";
  if (code.startsWith("23") || code.startsWith("42") || code.startsWith("PGRST")) {
    return error?.message ?? fallback;
  }
  return error ? "(message withheld)" : fallback;
}

export function describeFailure(error: PostgrestFailure): DbErrorKey {
  const message = error.message ?? "";
  switch (error.code) {
    case "23505":
      if (message.includes("students_pkey")) return "duplicateStudent";
      if (message.includes("classes_school_year_name_key")) return "duplicateClass";
      return "duplicate";
    case "23514":
    case "23502":
    case "22001":
    case "22003":
    case "22007":
    case "22008":
    case "22P02":
      return "rejected";
    case "23503":
      return "notFound";
    case "42501":
      return "denied";
    case "42P01":
    case "PGRST205":
      return "unavailable";
    case "42703":
    case "42883":
    case "PGRST202":
    case "PGRST204":
      return "mismatch";
    default:
      return "generic";
  }
}

// Logs the failure under a short reference that is also shown to the staff
// member, so a report can be matched to one log line, then throws.
export function failWrite(
  operation: string,
  error: PostgrestFailure | null,
  fallbackMessage: string,
  forcedKey?: DbErrorKey,
): never {
  const reference = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`Student module ${operation} failed [${reference}]`, {
    code: error?.code ?? null,
    message: safeMessage(error, fallbackMessage),
    hint: error?.hint ?? null,
  });
  throw new RecordWriteError(forcedKey ?? (error ? describeFailure(error) : "notFound"), reference);
}

export function failRead(operation: string, error: PostgrestFailure, userMessage: string): never {
  console.error(`Student module ${operation} failed`, {
    code: error.code ?? null,
    message: safeMessage(error, "read error"),
  });
  throw new RecordReadError(userMessage);
}

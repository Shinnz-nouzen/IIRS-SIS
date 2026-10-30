import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FieldErrors } from "./student-validation";

// Everything a Server Action returns to a form. Messages are resolved in the UI
// (so they follow the user's language): `errorKey` is a key of `dictionary.db`,
// or "review" for "check the highlighted fields".
export type DbErrorKey = keyof Dictionary["db"];

export type FormState = {
  errorKey: DbErrorKey | "review" | null;
  reference: string | null;
  fieldErrors: FieldErrors;
  values: Record<string, string>;
  savedId: string | null;
  savedAt: number | null;
};

export const initialFormState: FormState = {
  errorKey: null,
  reference: null,
  fieldErrors: {},
  values: {},
  savedId: null,
  savedAt: null,
};

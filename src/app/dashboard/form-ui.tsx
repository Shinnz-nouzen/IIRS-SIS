"use client";

import { useActionState, useTransition, type FormEvent, type ReactNode } from "react";
import { format } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { initialFormState, type FormState } from "@/lib/sis/form-state";
import { LIMITS, type ErrorCode, type FieldErrors } from "@/lib/sis/student-validation";
import { fieldClass } from "./sis-ui";

export const labelClass = "mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300";
export const errorInputClass = "border-rose-500 dark:border-rose-400";

// Maximum lengths shown in "too long" messages, keyed by form field name suffix.
const maxByField: Record<string, number> = {
  studentId: LIMITS.studentId,
  fullName: LIMITS.name,
  fullNameKm: LIMITS.name,
  placeOfBirth: LIMITS.placeOfBirth,
  nationality: LIMITS.nationality,
  addressLine: LIMITS.address,
  village: LIMITS.addressPart,
  commune: LIMITS.addressPart,
  district: LIMITS.addressPart,
  province: LIMITS.addressPart,
  addressNotes: LIMITS.addressNotes,
  NameEn: LIMITS.name,
  NameKm: LIMITS.name,
  Occupation: LIMITS.occupation,
  Relationship: LIMITS.contactRelationship,
  gradeLevel: LIMITS.gradeLevel,
  section: LIMITS.section,
  nameEn: LIMITS.className,
  nameKm: LIMITS.className,
};

// Submits through a transition instead of <form action>. React 19 resets a form
// after an `action` completes, which would wipe the staff member's input (and
// revert <select>s) when the server reports a validation error. Calling the
// action manually keeps every field, including the chosen photo, as typed.
export function useActionForm(action: (previous: FormState, formData: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [, startTransition] = useTransition();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  return { state, onSubmit, pending };
}

export function useErrorText() {
  const { t } = useI18n();
  return (name: string, code: ErrorCode | undefined): string | null => {
    if (!code) return null;
    const base = t.errors[code];
    if (code !== "tooLong") return base;
    const key = Object.keys(maxByField).find((k) => name === k || name.endsWith(k));
    return format(base, { max: key ? maxByField[key] : "" });
  };
}

export function Field({
  id,
  label,
  error,
  help,
  required,
  optionalHint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string | null;
  help?: string;
  required?: boolean;
  optionalHint?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-rose-600 dark:text-rose-400" aria-hidden="true">*</span>}
        {optionalHint && (
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">({t.common.optional})</span>
        )}
      </label>
      {children}
      {help && !error && <p id={`${id}-help`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{help}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = {
  name: string;
  label: string;
  defaultValue?: string;
  errors: FieldErrors;
  help?: string;
  required?: boolean;
  optionalHint?: boolean;
  type?: string;
  readOnly?: boolean;
  inputMode?: "text" | "decimal" | "tel" | "email" | "numeric";
  autoComplete?: string;
  lang?: string;
  className?: string;
  idPrefix?: string;
  maxLength?: number;
  onChange?: (value: string) => void;
  value?: string;
};

export function TextField({
  name, label, defaultValue, errors, help, required, optionalHint = !required, type = "text",
  readOnly, inputMode, autoComplete = "off", lang, className, idPrefix = "", maxLength, onChange, value,
}: InputProps) {
  const errorText = useErrorText();
  const message = errorText(name, errors[name]);
  const id = `${idPrefix}${name}`;
  return (
    <Field id={id} label={label} error={message} help={help} required={required} optionalHint={optionalHint && !readOnly} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        {...(value !== undefined ? { value } : { defaultValue })}
        readOnly={readOnly}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        lang={lang}
        maxLength={maxLength}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-error` : help ? `${id}-help` : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={`${fieldClass} ${message ? errorInputClass : ""} ${readOnly ? "bg-slate-50 text-slate-500 dark:bg-white/[0.04]" : ""}`}
      />
    </Field>
  );
}

export function SelectField({
  name, label, defaultValue, errors, options, placeholder, required, optionalHint = !required, className, idPrefix = "", help,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  errors: FieldErrors;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  optionalHint?: boolean;
  className?: string;
  idPrefix?: string;
  help?: string;
}) {
  const errorText = useErrorText();
  const message = errorText(name, errors[name]);
  const id = `${idPrefix}${name}`;
  return (
    <Field id={id} label={label} error={message} help={help} required={required} optionalHint={optionalHint} className={className}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-error` : undefined}
        className={`${fieldClass} ${message ? errorInputClass : ""}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function FormSection({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#15151b]">
      <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</legend>
      {help && <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{help}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormBanner({ state }: { state: FormState }) {
  const { t } = useI18n();
  if (!state.errorKey) return null;
  const message = state.errorKey === "review" ? t.form.reviewFields : t.db[state.errorKey];
  return (
    <p role="alert" className="rounded-md border border-rose-500/25 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
      {message}
      {state.reference && (
        <span className="mt-1 block text-xs opacity-80">
          {t.common.reference}: {state.reference}
        </span>
      )}
    </p>
  );
}

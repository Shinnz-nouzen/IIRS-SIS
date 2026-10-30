"use client";

import { useI18n } from "@/lib/i18n/provider";
import { GUARDIAN_RELATIONSHIPS, type FieldErrors } from "@/lib/sis/student-validation";
import { SelectField, TextField } from "../form-ui";

type Values = Record<string, string>;

// Shared by the registration form and the profile's add/edit forms. Field names
// are `${prefix}Relationship`, `${prefix}NameEn`, … (see student-validation.ts).
export function GuardianFields({
  prefix,
  values,
  errors,
  idPrefix = "",
  showPrimary = false,
}: {
  prefix: string;
  values: Values;
  errors: FieldErrors;
  idPrefix?: string;
  showPrimary?: boolean;
}) {
  const { t } = useI18n();
  const v = (suffix: string) => values[prefix + suffix] ?? "";
  return (
    <>
      <SelectField
        idPrefix={idPrefix}
        name={`${prefix}Relationship`}
        label={t.form.relationship}
        placeholder={t.form.relationshipPlaceholder}
        defaultValue={v("Relationship")}
        errors={errors}
        required
        options={GUARDIAN_RELATIONSHIPS.map((value) => ({ value, label: t.relationship[value] }))}
      />
      <TextField idPrefix={idPrefix} name={`${prefix}NameEn`} label={t.form.guardianNameEn} defaultValue={v("NameEn")} errors={errors} lang="en" autoComplete="off" />
      <TextField idPrefix={idPrefix} name={`${prefix}NameKm`} label={t.form.guardianNameKm} defaultValue={v("NameKm")} errors={errors} lang="km" />
      <TextField idPrefix={idPrefix} name={`${prefix}Phone`} label={t.form.phone} defaultValue={v("Phone")} errors={errors} required type="tel" inputMode="tel" autoComplete="off" help={t.form.phoneHelp} />
      <TextField idPrefix={idPrefix} name={`${prefix}PhoneAlt`} label={t.form.phoneAlt} defaultValue={v("PhoneAlt")} errors={errors} type="tel" inputMode="tel" />
      <TextField idPrefix={idPrefix} name={`${prefix}Email`} label={t.form.email} defaultValue={v("Email")} errors={errors} type="email" inputMode="email" />
      <TextField idPrefix={idPrefix} name={`${prefix}Occupation`} label={t.form.occupation} defaultValue={v("Occupation")} errors={errors} />
      <SelectField
        idPrefix={idPrefix}
        name={`${prefix}LivesWith`}
        label={t.form.livesWith}
        placeholder={t.form.livesWithUnknown}
        defaultValue={v("LivesWith")}
        errors={errors}
        options={[
          { value: "yes", label: t.common.yes },
          { value: "no", label: t.common.no },
        ]}
      />
      {showPrimary && (
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
          <input
            type="checkbox"
            name={`${prefix}IsPrimary`}
            defaultChecked={v("IsPrimary") === "on"}
            className="size-4 rounded border-slate-300 accent-violet-700"
          />
          {t.profile.makePrimary}
        </label>
      )}
    </>
  );
}

export function ContactFields({
  prefix,
  values,
  errors,
  idPrefix = "",
  showPriority = false,
}: {
  prefix: string;
  values: Values;
  errors: FieldErrors;
  idPrefix?: string;
  showPriority?: boolean;
}) {
  const { t } = useI18n();
  const v = (suffix: string) => values[prefix + suffix] ?? "";
  return (
    <>
      <TextField idPrefix={idPrefix} name={`${prefix}NameEn`} label={t.form.guardianNameEn} defaultValue={v("NameEn")} errors={errors} lang="en" />
      <TextField idPrefix={idPrefix} name={`${prefix}NameKm`} label={t.form.guardianNameKm} defaultValue={v("NameKm")} errors={errors} lang="km" />
      <TextField idPrefix={idPrefix} name={`${prefix}Relationship`} label={t.form.contactRelationship} defaultValue={v("Relationship")} errors={errors} required help={t.form.contactRelationshipHelp} />
      <TextField idPrefix={idPrefix} name={`${prefix}Phone`} label={t.form.phone} defaultValue={v("Phone")} errors={errors} required type="tel" inputMode="tel" help={t.form.phoneHelp} />
      <TextField idPrefix={idPrefix} name={`${prefix}PhoneAlt`} label={t.form.phoneAlt} defaultValue={v("PhoneAlt")} errors={errors} type="tel" inputMode="tel" />
      {showPriority && (
        <SelectField
          idPrefix={idPrefix}
          name={`${prefix}Priority`}
          label={t.form.priority}
          defaultValue={v("Priority") || "1"}
          errors={errors}
          required
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
        />
      )}
    </>
  );
}

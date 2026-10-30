"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { ClassRecord } from "@/lib/sis/class-records";
import { FormBanner, TextField, useActionForm } from "../form-ui";
import { primaryButtonClass } from "../sis-ui";
import { saveClassAction } from "./actions";

export function ClassForm({ record }: { record?: ClassRecord }) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useActionForm(saveClassAction);
  const initial: Record<string, string> = record
    ? {
        schoolYear: record.schoolYear,
        gradeLevel: record.gradeLevel,
        section: record.section ?? "",
        nameEn: record.nameEn,
        nameKm: record.nameKm ?? "",
        isActive: record.isActive ? "on" : "",
      }
    : { isActive: "on" };
  // After a successful create the server clears values; re-mount via key so the
  // empty form is shown again.
  const values: Record<string, string> =
    state.savedAt && !record ? { isActive: "on" } : { ...initial, ...state.values };
  const idPrefix = `class-${record?.id ?? "new"}-`;

  return (
    <form key={state.savedAt && !record ? state.savedAt : "form"} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="classId" value={record?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField idPrefix={idPrefix} name="schoolYear" label={t.classes.schoolYear} defaultValue={values.schoolYear} errors={state.fieldErrors} required readOnly={!!record} help={record ? undefined : t.classes.schoolYearHelp} />
        <TextField idPrefix={idPrefix} name="gradeLevel" label={t.classes.gradeLevel} defaultValue={values.gradeLevel} errors={state.fieldErrors} required help={t.classes.gradeLevelHelp} />
        <TextField idPrefix={idPrefix} name="nameEn" label={t.classes.nameEn} defaultValue={values.nameEn} errors={state.fieldErrors} required lang="en" />
        <TextField idPrefix={idPrefix} name="nameKm" label={t.classes.nameKm} defaultValue={values.nameKm} errors={state.fieldErrors} lang="km" />
        <TextField idPrefix={idPrefix} name="section" label={t.classes.section} defaultValue={values.section} errors={state.fieldErrors} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive === "on"} className="size-4 accent-violet-700" />
          {t.classes.active}
        </label>
      </div>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? t.common.saving : record ? t.common.save : t.classes.add}
      </button>
      {state.savedAt && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{t.classes.saved}</p>}
    </form>
  );
}

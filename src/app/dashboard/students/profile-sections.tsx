"use client";

import { useActionState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { ClassOption } from "@/lib/sis/class-records";
import { initialFormState, type FormState } from "@/lib/sis/form-state";
import { formatDate, formatPhone } from "@/lib/sis/format";
import type { EmergencyContact, Enrollment, Guardian } from "@/lib/sis/student-records";
import { FormBanner, SelectField, TextField, useActionForm } from "../form-ui";
import { buttonClass, Icon, Panel, primaryButtonClass, SectionTitle } from "../sis-ui";
import {
  assignClassAction,
  deleteContactAction,
  deleteGuardianAction,
  endEnrollmentAction,
  saveContactAction,
  saveGuardianAction,
} from "./actions";
import { ContactFields, GuardianFields } from "./related-fields";

function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border border-slate-200 dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-slate-50 dark:text-violet-200 dark:hover:bg-white/[0.04]">
        <Icon name="chevron" className="size-3.5 -rotate-90 transition-transform group-open:rotate-0" />
        {summary}
      </summary>
      <div className="border-t border-slate-200 p-4 dark:border-white/10">{children}</div>
    </details>
  );
}

function DeleteForm({
  action,
  studentId,
  idField,
  id,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  studentId: string;
  idField: "guardianId" | "contactId";
  id: string;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(t.common.confirmDelete)) event.preventDefault();
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name={idField} value={id} />
      <button type="submit" disabled={pending} className={`${buttonClass} text-rose-700 dark:text-rose-300`}>
        {t.common.delete}
      </button>
      {state.errorKey && <FormBanner state={state} />}
    </form>
  );
}

// ------------------------------- Guardians --------------------------------
function GuardianForm({ studentId, guardian }: { studentId: string; guardian?: Guardian }) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useActionForm(saveGuardianAction);
  const initial: Record<string, string> = guardian
    ? {
        guardianRelationship: guardian.relationship,
        guardianNameEn: guardian.fullNameEn ?? "",
        guardianNameKm: guardian.fullNameKm ?? "",
        guardianPhone: guardian.phone,
        guardianPhoneAlt: guardian.phoneAlt ?? "",
        guardianEmail: guardian.email ?? "",
        guardianOccupation: guardian.occupation ?? "",
        guardianLivesWith: guardian.livesWithStudent === null ? "" : guardian.livesWithStudent ? "yes" : "no",
        guardianIsPrimary: guardian.isPrimary ? "on" : "",
      }
    : {};
  const values = { ...initial, ...state.values };
  const idPrefix = `g-${guardian?.id ?? "new"}-`;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="guardianId" value={guardian?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <GuardianFields prefix="guardian" values={values} errors={state.fieldErrors} idPrefix={idPrefix} showPrimary />
      </div>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? t.common.saving : t.common.save}
      </button>
    </form>
  );
}

export function GuardiansPanel({ studentId, guardians }: { studentId: string; guardians: Guardian[] }) {
  const { lang, t } = useI18n();
  return (
    <Panel className="p-5">
      <SectionTitle title={t.profile.sectionGuardians} />
      <div className="mt-4 space-y-3">
        {guardians.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t.profile.noGuardians}</p>}
        {guardians.map((guardian) => {
          const primary = lang === "km" ? guardian.fullNameKm ?? guardian.fullNameEn : guardian.fullNameEn ?? guardian.fullNameKm;
          const secondary = lang === "km" ? (guardian.fullNameKm ? guardian.fullNameEn : null) : guardian.fullNameEn ? guardian.fullNameKm : null;
          return (
            <div key={`${guardian.id}:${JSON.stringify(guardian)}`} className="rounded-md border border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {primary}
                    {guardian.isPrimary && (
                      <span className="ml-2 rounded bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-200">
                        {t.profile.primaryBadge}
                      </span>
                    )}
                  </p>
                  {secondary && <p className="text-xs text-slate-500 dark:text-slate-400">{secondary}</p>}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.relationship[guardian.relationship as keyof typeof t.relationship] ?? guardian.relationship}
                    {guardian.occupation ? ` · ${guardian.occupation}` : ""}
                    {guardian.livesWithStudent !== null ? ` · ${t.form.livesWith}: ${guardian.livesWithStudent ? t.common.yes : t.common.no}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                <a href={`tel:${guardian.phone}`} className="hover:text-violet-700 dark:hover:text-violet-300">{formatPhone(guardian.phone)}</a>
                {guardian.phoneAlt && <a href={`tel:${guardian.phoneAlt}`} className="hover:text-violet-700 dark:hover:text-violet-300">{formatPhone(guardian.phoneAlt)}</a>}
                {guardian.email && <span className="break-all">{guardian.email}</span>}
              </p>
              <div className="mt-3 space-y-2">
                <Disclosure summary={t.profile.editGuardian}>
                  <GuardianForm studentId={studentId} guardian={guardian} />
                </Disclosure>
                <DeleteForm action={deleteGuardianAction} studentId={studentId} idField="guardianId" id={guardian.id} />
              </div>
            </div>
          );
        })}
        <div key={`new:${guardians.length}`}>
          <Disclosure summary={t.profile.addGuardian}>
            <GuardianForm studentId={studentId} />
          </Disclosure>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------- Emergency contacts ---------------------------
function ContactForm({ studentId, contact }: { studentId: string; contact?: EmergencyContact }) {
  const { t } = useI18n();
  const { state, onSubmit, pending } = useActionForm(saveContactAction);
  const initial: Record<string, string> = contact
    ? {
        contactNameEn: contact.fullNameEn ?? "",
        contactNameKm: contact.fullNameKm ?? "",
        contactRelationship: contact.relationship,
        contactPhone: contact.phone,
        contactPhoneAlt: contact.phoneAlt ?? "",
        contactPriority: String(contact.priority),
      }
    : {};
  const values = { ...initial, ...state.values };
  const idPrefix = `c-${contact?.id ?? "new"}-`;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormBanner state={state} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="contactId" value={contact?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFields prefix="contact" values={values} errors={state.fieldErrors} idPrefix={idPrefix} showPriority />
      </div>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? t.common.saving : t.common.save}
      </button>
    </form>
  );
}

export function ContactsPanel({ studentId, contacts }: { studentId: string; contacts: EmergencyContact[] }) {
  const { lang, t } = useI18n();
  return (
    <Panel className="p-5">
      <SectionTitle title={t.profile.sectionContacts} />
      <div className="mt-4 space-y-3">
        {contacts.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t.profile.noContacts}</p>}
        {contacts.map((contact) => {
          const primary = lang === "km" ? contact.fullNameKm ?? contact.fullNameEn : contact.fullNameEn ?? contact.fullNameKm;
          return (
            <div key={`${contact.id}:${JSON.stringify(contact)}`} className="rounded-md border border-slate-200 p-4 dark:border-white/10">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                <span className="mr-2 rounded bg-slate-500/10 px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">{contact.priority}</span>
                {primary}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{contact.relationship}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                <a href={`tel:${contact.phone}`} className="hover:text-violet-700 dark:hover:text-violet-300">{formatPhone(contact.phone)}</a>
                {contact.phoneAlt && <a href={`tel:${contact.phoneAlt}`} className="hover:text-violet-700 dark:hover:text-violet-300">{formatPhone(contact.phoneAlt)}</a>}
              </p>
              <div className="mt-3 space-y-2">
                <Disclosure summary={t.profile.editContact}>
                  <ContactForm studentId={studentId} contact={contact} />
                </Disclosure>
                <DeleteForm action={deleteContactAction} studentId={studentId} idField="contactId" id={contact.id} />
              </div>
            </div>
          );
        })}
        <div key={`new:${contacts.length}`}>
          <Disclosure summary={t.profile.addContact}>
            <ContactForm studentId={studentId} />
          </Disclosure>
        </div>
      </div>
    </Panel>
  );
}

// -------------------------------- Class ------------------------------------
export function ClassPanel({
  studentId,
  enrollments,
  classOptions,
}: {
  studentId: string;
  enrollments: Enrollment[];
  classOptions: ClassOption[];
}) {
  const { lang, t } = useI18n();
  const { state: assignState, onSubmit: onAssign, pending: assigning } = useActionForm(assignClassAction);
  const [endState, endAction, ending] = useActionState(endEnrollmentAction, initialFormState);
  const current = enrollments.find((item) => item.leftOn === null) ?? null;
  const label = (nameEn: string, nameKm: string | null) => (lang === "km" ? nameKm ?? nameEn : nameEn);
  const options = classOptions
    .filter((option) => option.isActive && option.id !== current?.classId)
    .map((option) => ({ value: option.id, label: `${label(option.nameEn, option.nameKm)} · ${option.schoolYear}` }));

  return (
    <Panel className="p-5">
      <SectionTitle title={t.profile.sectionClass} />
      <div className="mt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.profile.currentClass}</p>
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {current ? `${label(current.classNameEn, current.classNameKm)} · ${current.schoolYear}` : t.profile.noCurrentClass}
        </p>
      </div>

      <form key={assignState.savedAt ?? "idle"} onSubmit={onAssign} noValidate className="mt-4 space-y-3">
        <FormBanner state={assignState} />
        <input type="hidden" name="studentId" value={studentId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="classId" label={t.profile.changeClass} placeholder={t.form.classNone} defaultValue={assignState.values.classId} errors={assignState.fieldErrors} options={options} required idPrefix="assign-" />
          <TextField name="effectiveOn" type="date" label={t.profile.effectiveDate} defaultValue={assignState.values.effectiveOn} errors={assignState.fieldErrors} idPrefix="assign-" />
        </div>
        <button type="submit" disabled={assigning || options.length === 0} className={primaryButtonClass}>
          {assigning ? t.common.saving : t.profile.assign}
        </button>
        {options.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.form.classNoClasses}</p>
        )}
      </form>

      {current && (
        <form action={endAction} className="mt-3">
          <input type="hidden" name="studentId" value={studentId} />
          <button type="submit" disabled={ending} className={buttonClass}>
            {t.profile.removeFromClass}
          </button>
          <FormBanner state={endState} />
        </form>
      )}

      {enrollments.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t.profile.classHistory}</p>
          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
            {enrollments.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-x-3">
                <span>{label(item.classNameEn, item.classNameKm)} · {item.schoolYear}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(item.enrolledOn, lang)} – {item.leftOn ? formatDate(item.leftOn, lang) : t.profile.present}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}


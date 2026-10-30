"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { ClassOption } from "@/lib/sis/class-records";
import type { FormState } from "@/lib/sis/form-state";
import { openStreetMapLink } from "@/lib/sis/format";
import {
  STUDENT_STATUSES,
  GENDERS,
  isInsideCambodia,
  type FieldErrors,
  type StudentFormValues,
} from "@/lib/sis/student-validation";
import { Field, FormBanner, FormSection, SelectField, TextField, useActionForm, useErrorText } from "../form-ui";
import { buttonClass, fieldClass, Icon, primaryButtonClass } from "../sis-ui";
import { ContactFields, GuardianFields } from "./related-fields";

type Props = {
  mode: "create" | "update";
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  initial: StudentFormValues;
  originalStudentId?: string;
  classOptions?: ClassOption[];
  currentPhotoUrl?: string | null;
  cancelHref: string;
};

export function StudentForm({
  mode,
  action,
  initial,
  originalStudentId,
  classOptions = [],
  currentPhotoUrl = null,
  cancelHref,
}: Props) {
  const { lang, t } = useI18n();
  const { state, onSubmit, pending } = useActionForm(action);
  const values: Record<string, string> = { ...initial, ...state.values };
  const errors = state.fieldErrors;
  const v = (name: string) => values[name] ?? "";
  const activeClasses = classOptions.filter((option) => option.isActive);

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormBanner state={state} />
      {originalStudentId && <input type="hidden" name="originalStudentId" value={originalStudentId} />}

      <FormSection title={t.form.sectionIdentity}>
        <TextField
          name="studentId"
          label={t.form.studentId}
          defaultValue={v("studentId")}
          errors={errors}
          required={mode === "create"}
          readOnly={mode === "update"}
          help={mode === "create" ? t.form.studentIdHelp : undefined}
        />
        <SelectField
          name="enrollmentStatus"
          label={t.form.enrollmentStatus}
          defaultValue={v("enrollmentStatus")}
          errors={errors}
          required
          options={STUDENT_STATUSES.map((value) => ({ value, label: t.status[value] }))}
          help={t.status.provisional}
        />
        <TextField name="fullName" label={t.form.fullName} defaultValue={v("fullName")} errors={errors} required lang="en" help={t.form.fullNameHelp} />
        <TextField name="fullNameKm" label={t.form.fullNameKm} defaultValue={v("fullNameKm")} errors={errors} lang="km" help={lang === "km" ? undefined : t.form.fullNameKmHelp} />
        <TextField name="dateOfBirth" type="date" label={t.form.dateOfBirth} defaultValue={v("dateOfBirth")} errors={errors} />
        <SelectField
          name="gender"
          label={t.form.gender}
          defaultValue={v("gender")}
          errors={errors}
          placeholder={t.form.genderPlaceholder}
          options={GENDERS.map((value) => ({ value, label: t.gender[value] }))}
        />
        <TextField name="placeOfBirth" label={t.form.placeOfBirth} defaultValue={v("placeOfBirth")} errors={errors} />
        <TextField name="nationality" label={t.form.nationality} defaultValue={v("nationality")} errors={errors} />
        <TextField name="admissionDate" type="date" label={t.form.admissionDate} defaultValue={v("admissionDate")} errors={errors} />
      </FormSection>

      <PhotoSection currentUrl={currentPhotoUrl} errorCode={errors.photo} allowRemove={mode === "update"} />

      <FormSection title={t.form.sectionAddress}>
        <TextField name="addressLine" label={t.form.addressLine} defaultValue={v("addressLine")} errors={errors} className="sm:col-span-2" />
        <TextField name="village" label={t.form.village} defaultValue={v("village")} errors={errors} />
        <TextField name="commune" label={t.form.commune} defaultValue={v("commune")} errors={errors} />
        <TextField name="district" label={t.form.district} defaultValue={v("district")} errors={errors} />
        <TextField name="province" label={t.form.province} defaultValue={v("province")} errors={errors} />
        <TextField name="addressNotes" label={t.form.addressNotes} defaultValue={v("addressNotes")} errors={errors} className="sm:col-span-2" />
      </FormSection>

      <LocationSection initialLatitude={v("homeLatitude")} initialLongitude={v("homeLongitude")} errors={errors} />

      {mode === "create" && (
        <>
          <FormSection title={t.form.sectionClass}>
            {activeClasses.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">
                {t.form.classNoClasses}{" "}
                <Link href="/dashboard/classes" className="font-medium text-violet-700 underline dark:text-violet-300">
                  {t.nav.classes}
                </Link>
              </p>
            ) : (
              <SelectField
                name="classId"
                label={t.form.classLabel}
                defaultValue={v("classId")}
                errors={errors}
                placeholder={t.form.classNone}
                options={activeClasses.map((option) => ({
                  value: option.id,
                  label: `${lang === "km" ? option.nameKm ?? option.nameEn : option.nameEn} · ${option.schoolYear}`,
                }))}
              />
            )}
          </FormSection>

          <FormSection title={t.form.sectionGuardian} help={t.form.guardianHelp}>
            <GuardianFields prefix="guardian" values={values} errors={errors} />
          </FormSection>

          <FormSection title={t.form.sectionContact} help={t.form.contactHelp}>
            <ContactFields prefix="contact" values={values} errors={errors} />
          </FormSection>
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className={buttonClass}>
          {t.common.cancel}
        </Link>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? t.common.saving : mode === "create" ? t.directory.add : t.common.save}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Photo: resized in the browser (max 640px, JPEG) so a phone photo becomes a few
// hundred KB; the server still validates size and real content type.
// ---------------------------------------------------------------------------
async function resizeToJpeg(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= 700 * 1024) return new File([blob], "photo.jpg", { type: "image/jpeg" });
    }
    return null;
  } catch {
    return null;
  }
}

function PhotoSection({
  currentUrl,
  errorCode,
  allowRemove,
}: {
  currentUrl: string | null;
  errorCode: FieldErrors[string];
  allowRemove: boolean;
}) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState(false);
  const [remove, setRemove] = useState(false);
  const shown = remove ? null : (preview ?? currentUrl);
  const message = clientError ? t.errors.photoType : errorText("photo", errorCode);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    setClientError(false);
    if (!file) {
      setPreview(null);
      return;
    }
    const resized = await resizeToJpeg(file);
    if (!resized) {
      input.value = "";
      setPreview(null);
      setClientError(true);
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(resized);
    input.files = transfer.files;
    setRemove(false);
    setPreview(URL.createObjectURL(resized));
  }

  return (
    <FormSection title={t.form.sectionPhoto}>
      <div className="flex items-center gap-4 sm:col-span-2">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/15 dark:bg-white/[0.05]">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob/signed URL, not optimisable
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <Icon name="camera" className="size-7 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Field id="photo" label={shown ? t.form.photoChange : t.form.photoChoose} error={message} help={t.form.photoHelp} optionalHint>
            <input
              ref={inputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onChange}
              aria-invalid={message ? true : undefined}
              className={`${fieldClass} h-auto py-1.5 file:mr-3 file:rounded file:border-0 file:bg-violet-700 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white`}
            />
          </Field>
          {allowRemove && currentUrl && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                name="removePhoto"
                checked={remove}
                onChange={(event) => setRemove(event.target.checked)}
                className="size-4 accent-violet-700"
              />
              {t.form.photoRemove}
            </label>
          )}
        </div>
      </div>
    </FormSection>
  );
}

// ---------------------------------------------------------------------------
// Map location: manual coordinates (optionally from the device GPS). No map
// widget is loaded on the form; the profile page shows an OpenStreetMap view.
// ---------------------------------------------------------------------------
function LocationSection({
  initialLatitude,
  initialLongitude,
  errors,
}: {
  initialLatitude: string;
  initialLongitude: string;
  errors: FieldErrors;
}) {
  const { t } = useI18n();
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [locating, setLocating] = useState(false);
  const [geoFailed, setGeoFailed] = useState(false);

  const lat = Number(latitude.replace(",", "."));
  const lon = Number(longitude.replace(",", "."));
  const valid = latitude.trim() !== "" && longitude.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const outside = valid && !isInsideCambodia(lat, lon);

  function fillFromDevice() {
    if (!navigator.geolocation) {
      setGeoFailed(true);
      return;
    }
    setLocating(true);
    setGeoFailed(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setGeoFailed(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <FormSection title={t.form.sectionLocation} help={t.form.locationHelp}>
      <TextField name="homeLatitude" label={t.form.latitude} errors={errors} value={latitude} onChange={setLatitude} inputMode="decimal" />
      <TextField name="homeLongitude" label={t.form.longitude} errors={errors} value={longitude} onChange={setLongitude} inputMode="decimal" />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="button" onClick={fillFromDevice} disabled={locating} className={buttonClass}>
          {locating ? t.form.locating : t.form.useMyLocation}
        </button>
        {valid && (
          <a href={openStreetMapLink(lat, lon)} target="_blank" rel="noopener noreferrer" className={buttonClass}>
            {t.form.openMap}
            <Icon name="external" className="size-4" />
          </a>
        )}
      </div>
      {geoFailed && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300 sm:col-span-2">{t.form.locationFailed}</p>}
      {outside && <p role="status" className="text-xs text-amber-800 dark:text-amber-300 sm:col-span-2">{t.form.locationOutside}</p>}
    </FormSection>
  );
}

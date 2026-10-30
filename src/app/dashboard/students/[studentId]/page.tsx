import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { format } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { listClassOptions, type ClassOption } from "@/lib/sis/class-records";
import {
  displayName,
  formatDate,
  formatTimestamp,
  openStreetMapEmbed,
  openStreetMapLink,
} from "@/lib/sis/format";
import { getPhotoUrls, getStudentProfile, type StudentProfile } from "@/lib/sis/student-records";
import { ageInYears, todayInPhnomPenh } from "@/lib/sis/student-validation";
import { PageHeader } from "../../page-header";
import { buttonClass, Icon, Panel, primaryButtonClass, SectionTitle, StatusBadge } from "../../sis-ui";
import { ClassPanel, ContactsPanel, GuardiansPanel } from "../profile-sections";
import { StudentAvatar } from "../student-avatar";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: SearchParams;
}) {
  const { studentId: rawId } = await params;
  const query = await searchParams;
  const studentId = decodeURIComponent(rawId);
  const { lang, t } = await getI18n();

  let profile: StudentProfile | null;
  let classOptions: ClassOption[] = [];
  try {
    [profile, classOptions] = await Promise.all([getStudentProfile(studentId), listClassOptions()]);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Student profile page failed.", error);
    return (
      <Panel className="p-6">
        <p role="alert" className="text-sm font-medium text-rose-800 dark:text-rose-200">{t.profile.unavailable}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.directory.loadErrorDetail}</p>
      </Panel>
    );
  }
  if (!profile) notFound();

  const photoUrls = await getPhotoUrls([profile.photoPath]);
  const photoUrl = profile.photoPath ? photoUrls[profile.photoPath] ?? null : null;
  const name = displayName(profile.fullName, profile.fullNameKm, lang);
  const age = profile.dateOfBirth ? ageInYears(profile.dateOfBirth, todayInPhnomPenh()) : null;
  const current = profile.enrollments.find((item) => item.leftOn === null);
  const justCreated = query.created === "1";
  const justSaved = query.saved === "1";
  const hasAddress = [profile.addressLine, profile.village, profile.commune, profile.district, profile.province].some(Boolean);
  const hasLocation = profile.homeLatitude !== null && profile.homeLongitude !== null;
  const editHref = `/dashboard/students/${encodeURIComponent(profile.studentId)}/edit`;

  return (
    <div>
      <Link href="/dashboard/students" className="text-xs text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200">
        ← {t.profile.back}
      </Link>

      {(justCreated || justSaved) && (
        <p role="status" className="mt-4 rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          {justCreated ? t.form.savedCreated : t.form.savedUpdated}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-4">
        <StudentAvatar url={photoUrl} name={name.primary} size="size-20" textSize="text-2xl" />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={name.primary}
            detail={[name.secondary, profile.studentId].filter(Boolean).join(" · ")}
            action={
              <Link href={editHref} className={primaryButtonClass}>
                <Icon name="edit" className="size-4" /> {t.profile.editStudent}
              </Link>
            }
          />
          <div className="-mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={profile.status} label={t.status[profile.status]} />
            {current && (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {lang === "km" ? current.classNameKm ?? current.classNameEn : current.classNameEn} · {current.schoolYear}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle title={t.profile.sectionPersonal} />
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Item label={t.form.fullName} value={profile.fullName} />
              <Item label={t.form.fullNameKm} value={profile.fullNameKm} lang="km" />
              <Item label={t.form.dateOfBirth} value={profile.dateOfBirth ? formatDate(profile.dateOfBirth, lang) : null}
                extra={age !== null ? format(t.profile.ageValue, { n: age }) : undefined} />
              <Item label={t.form.gender} value={profile.gender ? t.gender[profile.gender as "female" | "male"] : null} />
              <Item label={t.form.placeOfBirth} value={profile.placeOfBirth} />
              <Item label={t.form.nationality} value={profile.nationality} />
              <Item label={t.form.admissionDate} value={profile.admissionDate ? formatDate(profile.admissionDate, lang) : null} />
              <Item label={t.form.enrollmentStatus} value={t.status[profile.status]} />
            </dl>
          </Panel>

          <ClassPanel studentId={profile.studentId} enrollments={profile.enrollments} classOptions={classOptions} />
          <GuardiansPanel studentId={profile.studentId} guardians={profile.guardians} />
          <ContactsPanel studentId={profile.studentId} contacts={profile.contacts} />
        </div>

        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle title={t.profile.sectionAddress} />
            {hasAddress ? (
              <address className="mt-4 space-y-1 text-sm not-italic text-slate-700 dark:text-slate-200">
                {profile.addressLine && <p>{profile.addressLine}</p>}
                <p>{[profile.village, profile.commune, profile.district, profile.province].filter(Boolean).join(", ")}</p>
                {profile.addressNotes && <p className="text-xs text-slate-500 dark:text-slate-400">{profile.addressNotes}</p>}
              </address>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t.profile.noAddress}</p>
            )}

            {hasLocation ? (
              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {t.profile.coordinates}: <span className="font-mono">{profile.homeLatitude}, {profile.homeLongitude}</span>
                </p>
                <iframe
                  title={t.profile.mapTitle}
                  src={openStreetMapEmbed(profile.homeLatitude!, profile.homeLongitude!)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-56 w-full rounded-md border border-slate-200 dark:border-white/15"
                />
                <a href={openStreetMapLink(profile.homeLatitude!, profile.homeLongitude!)} target="_blank" rel="noopener noreferrer" className={`${buttonClass} mt-2`}>
                  {t.profile.viewOnMap} <Icon name="external" className="size-4" />
                </a>
                <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{t.profile.mapNote}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t.profile.noLocation}</p>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t.profile.sectionRecord} />
            <dl className="mt-4 space-y-3">
              <Item label={t.common.created} value={formatTimestamp(profile.createdAt, lang)} />
              <Item label={t.common.updated} value={formatTimestamp(profile.updatedAt, lang)} />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, extra, lang }: { label: string; value: string | null | undefined; extra?: string; lang?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd lang={lang} className="mt-1 text-sm text-slate-900 dark:text-slate-100">
        {value ? value : <span className="text-slate-400 dark:text-slate-500">—</span>}
        {value && extra && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">({extra})</span>}
      </dd>
    </div>
  );
}

import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getPhotoUrls, getStudentProfile } from "@/lib/sis/student-records";
import { emptyStudentValues, type StudentFormValues } from "@/lib/sis/student-validation";
import { PageHeader } from "../../../page-header";
import { Panel } from "../../../sis-ui";
import { updateStudentAction } from "../../actions";
import { StudentForm } from "../../student-form";

export const instant = false;

export default async function EditStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId: rawId } = await params;
  const studentId = decodeURIComponent(rawId);
  const { t } = await getI18n();

  let profile;
  try {
    profile = await getStudentProfile(studentId);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Edit student page failed.", error);
    return (
      <Panel className="p-6" >
        <p role="alert" className="text-sm text-rose-800 dark:text-rose-200">{t.profile.unavailable}</p>
      </Panel>
    );
  }
  if (!profile) notFound();

  const photoUrls = await getPhotoUrls([profile.photoPath]);
  const initial: StudentFormValues = {
    ...emptyStudentValues,
    studentId: profile.studentId,
    fullName: profile.fullName,
    fullNameKm: profile.fullNameKm ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    gender: profile.gender ?? "",
    placeOfBirth: profile.placeOfBirth ?? "",
    nationality: profile.nationality ?? "",
    admissionDate: profile.admissionDate ?? "",
    enrollmentStatus: profile.status,
    addressLine: profile.addressLine ?? "",
    village: profile.village ?? "",
    commune: profile.commune ?? "",
    district: profile.district ?? "",
    province: profile.province ?? "",
    addressNotes: profile.addressNotes ?? "",
    homeLatitude: profile.homeLatitude === null ? "" : String(profile.homeLatitude),
    homeLongitude: profile.homeLongitude === null ? "" : String(profile.homeLongitude),
  };
  const profileHref = `/dashboard/students/${encodeURIComponent(profile.studentId)}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={profileHref} className="text-xs text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200">
        ← {profile.fullName}
      </Link>
      <div className="mt-4">
        <PageHeader title={t.form.editTitle} detail={`${profile.studentId} · ${profile.fullName}`} />
        <StudentForm
          mode="update"
          action={updateStudentAction}
          initial={initial}
          originalStudentId={profile.studentId}
          currentPhotoUrl={profile.photoPath ? photoUrls[profile.photoPath] ?? null : null}
          cancelHref={profileHref}
        />
      </div>
    </div>
  );
}

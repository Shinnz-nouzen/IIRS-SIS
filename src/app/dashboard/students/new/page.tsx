import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { listClassOptions, type ClassOption } from "@/lib/sis/class-records";
import { emptyStudentValues } from "@/lib/sis/student-validation";
import { PageHeader } from "../../page-header";
import { createStudentAction } from "../actions";
import { StudentForm } from "../student-form";

export const instant = false;

export default async function NewStudentPage() {
  const { t } = await getI18n();
  let classOptions: ClassOption[] = [];
  try {
    classOptions = await listClassOptions();
  } catch (error) {
    unstable_rethrow(error);
    console.error("New student page could not load classes.", error);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/students" className="text-xs text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200">
        ← {t.profile.back}
      </Link>
      <div className="mt-4">
        <PageHeader title={t.form.createTitle} detail={t.form.createDetail} />
        <StudentForm
          mode="create"
          action={createStudentAction}
          initial={emptyStudentValues}
          classOptions={classOptions}
          cancelHref="/dashboard/students"
        />
      </div>
    </div>
  );
}

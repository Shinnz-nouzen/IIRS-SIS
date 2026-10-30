import { redirect } from "next/navigation";
import { getActiveStaff } from "@/lib/auth/staff";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "../page-header";
import { Panel, SectionTitle } from "../sis-ui";

export const instant = false;

export default async function StaffPage() {
  const [staff, { t }] = await Promise.all([getActiveStaff(), getI18n()]);
  if (!staff) redirect("/login");
  return (
    <>
      <PageHeader eyebrow={t.brand.school} title={t.nav.staff} />
      <Panel className="p-5">
        <SectionTitle title={t.staffPage.title} detail={t.staffPage.detail} />
        <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">
          {t.staffPage.role}: <span className="font-medium">{t.roles[staff.role]}</span>
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t.staffPage.note}</p>
      </Panel>
    </>
  );
}

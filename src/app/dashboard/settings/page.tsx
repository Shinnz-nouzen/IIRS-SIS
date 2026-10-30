import { getI18n, getTheme } from "@/lib/i18n/server";
import { LanguageSwitch, ThemeToggle } from "../dashboard-shell";
import { PageHeader } from "../page-header";
import { Panel, SectionTitle } from "../sis-ui";

export const instant = false;

export default async function SettingsPage() {
  const [{ t }, theme] = await Promise.all([getI18n(), getTheme()]);
  return (
    <>
      <PageHeader eyebrow={t.brand.school} title={t.nav.settings} />
      <Panel className="p-5">
        <SectionTitle title={t.settingsPage.title} detail={t.settingsPage.detail} />
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t.settingsPage.languageLabel}</p>
            <LanguageSwitch />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t.settingsPage.themeLabel}</p>
            <ThemeToggle dark={theme === "dark"} />
          </div>
        </div>
      </Panel>
    </>
  );
}

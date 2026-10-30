import { redirect, unstable_rethrow } from "next/navigation";
import { type ActiveStaff, getActiveStaff } from "@/lib/auth/staff";
import { getLang, getTheme } from "@/lib/i18n/server";
import { DashboardShell } from "./dashboard-shell";

// Reads cookies and the session on every request.
export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let staff: ActiveStaff | null;
  try {
    staff = await getActiveStaff();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Dashboard staff authorization check failed.", error);
    redirect("/login");
  }
  if (!staff) redirect("/login");

  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <DashboardShell role={staff.role} lang={lang} theme={theme}>
      {children}
    </DashboardShell>
  );
}

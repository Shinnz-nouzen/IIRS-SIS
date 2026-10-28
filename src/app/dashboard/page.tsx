import { redirect, unstable_rethrow } from "next/navigation";
import {
  type ActiveStaff,
  getActiveStaff,
} from "@/lib/auth/staff";
import { SisDashboard } from "./sis-dashboard";

export const instant = false;

export default async function DashboardPage() {
  let staff: ActiveStaff | null;

  try {
    staff = await getActiveStaff();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Dashboard staff authorization check failed.", error);
    redirect("/login");
  }

  if (!staff) {
    redirect("/login");
  }

  return <SisDashboard />;
}

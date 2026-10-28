import { redirect } from "next/navigation";
import { getActiveStaff } from "@/lib/auth/staff";

export const instant = false;

export default async function StudentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await getActiveStaff();

  if (!staff) {
    redirect("/login");
  }

  return children;
}

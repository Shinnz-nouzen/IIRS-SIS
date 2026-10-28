export type StaffRole = "administrator" | "office_staff";

export type StaffProfile = {
  user_id: string;
  role: string;
  is_active: boolean;
};

const staffRoles: readonly StaffRole[] = [
  "administrator",
  "office_staff",
];

export function isAuthorizedStaffProfile(
  userId: string,
  profile: StaffProfile | null,
): profile is StaffProfile & { role: StaffRole } {
  return (
    profile !== null &&
    profile.user_id === userId &&
    profile.is_active === true &&
    staffRoles.some((role) => role === profile.role)
  );
}

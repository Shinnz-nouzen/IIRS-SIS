import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isAuthorizedStaffProfile,
  type StaffRole,
} from "./staff-policy";

export type { StaffRole } from "./staff-policy";

export type ActiveStaff = {
  userId: string;
  role: StaffRole;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class StaffAuthorizationError extends Error {
  constructor(message = "Active staff authorization is required.") {
    super(message);
    this.name = "StaffAuthorizationError";
  }
}

export async function getActiveStaff(
  supabase?: ServerSupabaseClient
): Promise<ActiveStaff | null> {
  try {
    const client = supabase ?? (await createClient());
    const { data: claimsData, error: claimsError } =
      await client.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || typeof userId !== "string") {
      return null;
    }

    const { data: profile, error: profileError } = await client
      .from("staff_profiles")
      .select("user_id, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!isAuthorizedStaffProfile(userId, profile)) {
      return null;
    }

    return {
      userId,
      role: profile.role,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Active staff verification failed.", error);
    return null;
  }
}

export async function requireActiveStaff(
  supabase?: ServerSupabaseClient
): Promise<ActiveStaff> {
  const staff = await getActiveStaff(supabase);

  if (!staff) {
    throw new StaffAuthorizationError();
  }

  return staff;
}

export async function requireStaffRole(
  role: StaffRole,
  supabase?: ServerSupabaseClient
): Promise<ActiveStaff> {
  const staff = await requireActiveStaff(supabase);

  if (staff.role !== role) {
    throw new StaffAuthorizationError("The required staff role is missing.");
  }

  return staff;
}

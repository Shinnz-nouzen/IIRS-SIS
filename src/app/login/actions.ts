"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import {
  type ActiveStaff,
  getActiveStaff,
} from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

type LoginState = {
  error: string | null;
};

const genericSignInError =
  "Unable to sign in with those details. Check your credentials or contact your administrator.";

async function rejectSignIn(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<LoginState> {
  let primarySignOutError: unknown = null;

  try {
    const { error } = await supabase.auth.signOut();
    primarySignOutError = error;
  } catch (error) {
    primarySignOutError = error;
  }

  if (primarySignOutError) {
    console.error(
      "Primary sign-out failed while rejecting a sign-in.",
      primarySignOutError
    );

    try {
      const { error: localSignOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (localSignOutError) {
        console.error(
          "Local sign-out failed while rejecting a sign-in.",
          localSignOutError
        );
      }
    } catch (localSignOutError) {
      console.error(
        "Local sign-out threw while rejecting a sign-in.",
        localSignOutError
      );
    }
  }

  return { error: genericSignInError };
}

export async function signIn(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { error: "Enter your email address and password." };
  }

  const email = emailValue.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (passwordValue.length === 0 || passwordValue.length > 1024) {
    return { error: "Enter your password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordValue,
  });

  if (error) {
    return {
      error: genericSignInError,
    };
  }

  let staff: ActiveStaff | null;

  try {
    staff = await getActiveStaff(supabase);
  } catch (verificationError) {
    unstable_rethrow(verificationError);
    console.error(
      "Staff profile verification failed during sign-in.",
      verificationError
    );
    return rejectSignIn(supabase);
  }

  if (!staff) {
    return rejectSignIn(supabase);
  }

  redirect("/dashboard");
}

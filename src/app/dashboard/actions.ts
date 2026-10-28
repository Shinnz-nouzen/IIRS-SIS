"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut(
  _previousState: string | null,
  _formData: FormData
): Promise<string | null> {
  void _previousState;
  void _formData;

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return "Unable to sign out. Please try again.";
  }

  redirect("/login");
}

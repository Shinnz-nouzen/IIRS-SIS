"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActiveStaff } from "@/lib/auth/staff";
import { isLang } from "@/lib/i18n/dictionaries";
import { LANG_COOKIE, THEME_COOKIE } from "@/lib/i18n/server";
import { writeLanguagePreference } from "@/lib/sis/student-records";

const oneYear = 60 * 60 * 24 * 365;

export async function setLanguageAction(language: string): Promise<{ ok: boolean }> {
  if (!isLang(language)) return { ok: false };
  const staff = await requireActiveStaff();
  (await cookies()).set(LANG_COOKIE, language, {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  await writeLanguagePreference(staff.userId, language);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function setThemeAction(theme: string): Promise<{ ok: boolean }> {
  if (theme !== "light" && theme !== "dark") return { ok: false };
  await requireActiveStaff();
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

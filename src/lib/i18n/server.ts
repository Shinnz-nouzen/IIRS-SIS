import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getActiveStaff } from "@/lib/auth/staff";
import { readLanguagePreference } from "@/lib/sis/student-records";
import { dictionaries, isLang, type Dictionary, type Lang } from "./dictionaries";

export const LANG_COOKIE = "sis_lang";
export const THEME_COOKIE = "sis_theme";
export type Theme = "light" | "dark";

// Cookie first (fast, per device); otherwise the saved per-account preference;
// otherwise English. Cached per request so layouts and pages agree.
export const getLang = cache(async (): Promise<Lang> => {
  const cookieValue = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(cookieValue)) return cookieValue;
  const staff = await getActiveStaff();
  if (staff) {
    const saved = await readLanguagePreference(staff.userId);
    if (saved) return saved;
  }
  return "en";
});

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" ? "light" : "dark";
}

export async function getI18n(): Promise<{ lang: Lang; t: Dictionary }> {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}

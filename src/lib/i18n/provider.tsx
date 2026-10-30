"use client";

import { createContext, useContext } from "react";
import { dictionaries, format, type Dictionary, type Lang } from "./dictionaries";

type I18n = { lang: Lang; t: Dictionary };
const I18nContext = createContext<I18n>({ lang: "en", t: dictionaries.en });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ lang, t: dictionaries[lang] }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

export { format };

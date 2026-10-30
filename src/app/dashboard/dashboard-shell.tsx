"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";
import { setLanguageAction, setThemeAction } from "./preferences-actions";
import { SignOutButton } from "./sign-out-button";
import { buttonClass, Icon, navigation, type NavKey } from "./sis-ui";

type Role = "administrator" | "office_staff";

export function DashboardShell({
  role,
  lang,
  theme,
  children,
}: {
  role: Role;
  lang: Lang;
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <I18nProvider lang={lang}>
      <ShellFrame role={role} theme={theme}>
        {children}
      </ShellFrame>
    </I18nProvider>
  );
}

function activeKey(pathname: string): NavKey {
  const match = navigation
    .filter((item) => item.href !== "/dashboard")
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.key ?? "overview";
}

function ShellFrame({
  role,
  theme,
  children,
}: {
  role: Role;
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuOpen = menuOpenFor === pathname;
  const dark = theme === "dark";
  const current = activeKey(pathname);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div
      lang={lang}
      className={dark ? "dark" : ""}
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      <div className="min-h-screen bg-[#f4f4f8] text-slate-900 dark:bg-[#0d0d11] dark:text-slate-100">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151b] lg:flex">
          <Brand />
          <SidebarNavigation current={current} />
          <div className="mt-auto border-t border-slate-100 p-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-800 dark:text-violet-200">
                I
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {t.nav.staffWorkspace}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.roles[role]}</p>
              </div>
            </div>
            <div className="mt-3">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="lg:pl-[252px]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#15151b]/95">
            <div className="flex h-[64px] items-center justify-between gap-3 px-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpenFor(menuOpen ? null : pathname)}
                  className={`${buttonClass} size-9 px-0 lg:hidden`}
                >
                  <Icon name={menuOpen ? "close" : "menu"} />
                </button>
                <div className="lg:hidden">
                  <Brand compact />
                </div>
                <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                  <span>{t.nav.workspace}</span>
                  <Icon name="chevron" className="size-3 -rotate-90" />
                  <span className="font-medium text-slate-800 dark:text-slate-100">{t.nav[current]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitch />
                <ThemeToggle dark={dark} />
              </div>
            </div>
            {menuOpen && (
              <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#15151b] lg:hidden">
                <SidebarNavigation current={current} compact />
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
                  <SignOutButton />
                </div>
              </div>
            )}
          </header>

          <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-7 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function LanguageSwitch() {
  const { lang, t } = useI18n();
  const [pending, startTransition] = useTransition();
  const labels: Record<Lang, string> = { en: "EN", km: "ខ្មែរ" };

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className="inline-flex overflow-hidden rounded-md border border-slate-200 dark:border-white/15"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          disabled={pending}
          aria-pressed={lang === code}
          onClick={() => {
            if (code !== lang) startTransition(() => void setLanguageAction(code));
          }}
          className={`min-h-9 px-3 text-xs font-medium transition disabled:opacity-60 ${
            lang === code
              ? "bg-violet-700 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-[#19191f] dark:text-slate-200 dark:hover:bg-white/[0.07]"
          }`}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({ dark }: { dark: boolean }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void setThemeAction(dark ? "light" : "dark"))}
      aria-label={dark ? t.common.lightMode : t.common.darkMode}
      className={`${buttonClass} size-9 px-0`}
    >
      <Icon name={dark ? "sun" : "moon"} className="size-[17px]" />
    </button>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${
        compact ? "" : "border-b border-slate-100 px-4 py-4 dark:border-white/10"
      }`}
    >
      <Image
        src="/iirs-logo.jpg"
        alt="IIRS logo"
        width={42}
        height={42}
        priority
        className="size-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-white/15"
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{t.brand.short}</p>
        {!compact && (
          <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{t.brand.school}</p>
        )}
      </div>
    </div>
  );
}

function SidebarNavigation({ current, compact = false }: { current: NavKey; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t.nav.main}
      className={compact ? "grid grid-cols-2 gap-1" : "space-y-1 px-3 py-5"}
    >
      {!compact && (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t.nav.workspace}
        </p>
      )}
      {navigation.map((item) => {
        const active = current === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
              active
                ? "bg-violet-500/10 text-violet-800 dark:text-violet-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
            }`}
          >
            <Icon name={item.icon} className="size-[17px]" />
            <span>{t.nav[item.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

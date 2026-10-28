"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StudentCounts } from "@/lib/sis/student-records";
import { SignOutButton } from "./sign-out-button";
import {
  buttonClass,
  EmptyState,
  Icon,
  navigation,
  Panel,
  primaryButtonClass,
  SectionTitle,
  type Section,
} from "./sis-ui";

const descriptions: Record<Section, string> = {
  Overview: "Live student totals from the school database.",
  Students: "Manage persistent, staff-only student records.",
  Classes: "Not implemented yet.",
  Attendance: "Not implemented yet.",
  Grades: "Not implemented yet.",
  Reports: "Not implemented yet.",
  "Staff & Access": "Your current access level.",
  Settings: "Display preferences.",
};

const notImplemented: Partial<Record<Section, string>> = {
  Classes:
    "Class records are not stored anywhere yet. Class structure, grade levels and sections must be confirmed by the school before a table is designed.",
  Attendance:
    "Attendance recording is not connected to any data source yet. Nothing shown here would be saved.",
  Grades:
    "Grade entry is not implemented. Grading scales and report-card rules need school approval first.",
  Reports:
    "Reports and exports are not implemented. Exports will be added only together with server-side authorization and audit logging.",
};

export function SisDashboard({
  role,
  counts,
}: {
  role: "administrator" | "office_staff";
  counts: StudentCounts | null;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Overview");
  const [darkMode, setDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigate(next: Section) {
    if (next === "Students") {
      router.push("/dashboard/students");
      return;
    }
    setSection(next);
    setMobileMenuOpen(false);
  }

  const roleLabel = role === "administrator" ? "Administrator" : "Office staff";

  return (
    <div className={darkMode ? "dark" : ""} style={{ colorScheme: darkMode ? "dark" : "light" }}>
      <div className="min-h-screen bg-[#f4f4f8] text-slate-900 dark:bg-[#0d0d11] dark:text-slate-100">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151b] lg:flex">
          <Brand />
          <SidebarNavigation section={section} onSelect={navigate} />
          <div className="mt-auto border-t border-slate-100 p-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-800 dark:text-violet-200">I</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">Staff workspace</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{roleLabel}</p></div>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="lg:pl-[252px]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#15151b]/95">
            <div className="flex h-[64px] items-center justify-between gap-3 px-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className={`${buttonClass} size-9 px-0 lg:hidden`}><Icon name="menu" /></button>
                <div className="lg:hidden"><Brand compact /></div>
                <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                  <span>Workspace</span><Icon name="chevron" className="size-3 -rotate-90" /><span className="font-medium text-slate-800 dark:text-slate-100">{section}</span>
                </div>
              </div>
              <button type="button" onClick={() => setDarkMode((dark) => !dark)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={`${buttonClass} size-9 px-0`}><Icon name={darkMode ? "sun" : "moon"} className="size-[17px]" /></button>
            </div>
            {mobileMenuOpen && (
              <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#15151b] lg:hidden">
                <SidebarNavigation section={section} onSelect={navigate} compact />
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10"><SignOutButton /></div>
              </div>
            )}
          </header>

          <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-7 xl:px-10">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">International Intellectual Resource School</p>
                <h1 className="text-[23px] font-semibold tracking-tight text-slate-950 dark:text-white">{section === "Overview" ? "School operations" : section}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descriptions[section]}</p>
              </div>
              {section === "Overview" && <Link href="/dashboard/students" className={primaryButtonClass}><Icon name="users" className="size-4" /> Open students</Link>}
            </div>

            {section === "Overview" && (
              counts ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Students" value={counts.total} />
                  <Metric label="Active" value={counts.active} />
                  <Metric label="Inactive" value={counts.inactive} />
                </div>
              ) : (
                <p role="alert" className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-800 dark:text-rose-200">
                  Student totals could not be loaded. Open the Students page for details.
                </p>
              )
            )}

            {notImplemented[section] && (
              <Panel>
                <EmptyState title="Not implemented" detail={notImplemented[section]!} />
              </Panel>
            )}

            {section === "Staff & Access" && (
              <Panel className="p-5">
                <SectionTitle title="Your access" detail="Verified against your active staff profile on the server" />
                <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">Role: <span className="font-medium">{roleLabel}</span></p>
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Staff invitations, deactivation and role management are not implemented. Staff accounts are provisioned by an administrator directly in the database.</p>
              </Panel>
            )}

            {section === "Settings" && (
              <Panel className="p-5">
                <SectionTitle title="Display" detail="Applies to this page only and is not saved" />
                <button type="button" onClick={() => setDarkMode((dark) => !dark)} className={`${buttonClass} mt-4`}>{darkMode ? "Switch to light mode" : "Switch to dark mode"}</button>
              </Panel>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel className="p-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </Panel>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${compact ? "" : "border-b border-slate-100 px-4 py-4 dark:border-white/10"}`}>
      <Image src="/iirs-logo.jpg" alt="IIRS logo" width={42} height={42} priority className="size-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-white/15" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">IIRS · School SIS</p>
        {!compact && <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">International Intellectual Resource School</p>}
      </div>
    </div>
  );
}

function SidebarNavigation({
  section,
  onSelect,
  compact = false,
}: {
  section: Section;
  onSelect: (section: Section) => void;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Main navigation" className={compact ? "grid grid-cols-2 gap-1" : "space-y-1 px-3 py-5"}>
      {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p>}
      {navigation.map((item) => {
        const active = section === item.name;
        return (
          <button key={item.name} type="button" onClick={() => onSelect(item.name)} aria-current={active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${active ? "bg-violet-500/10 text-violet-800 dark:text-violet-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"}`}>
            <Icon name={item.icon} className="size-[17px]" /><span>{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

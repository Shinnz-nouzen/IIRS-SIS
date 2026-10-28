"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { demoDataSource } from "@/lib/sis/demo-data";
import type {
  AttendanceRecord,
  GradeRecord,
  SchoolClass,
  Student,
} from "@/lib/sis/types";
import { SignOutButton } from "./sign-out-button";
import {
  AttendanceSection,
  classLabel,
  ClassesSection,
  GradesSection,
  OverviewSection,
  ReportsSection,
  SettingsSection,
  StaffSection,
} from "./sis-sections";
import {
  buttonClass,
  DemoMark,
  fieldClass,
  Icon,
  navigation,
  primaryButtonClass,
  type Section,
} from "./sis-ui";

const descriptions: Record<Section, string> = {
  Overview: "A practical view of school-office workflows in the local preview.",
  Students: "Manage persistent, staff-only student records.",
  Classes: "Explore illustrative class details and demo rosters.",
  Attendance: "Review and update a temporary attendance register.",
  Grades: "Explore sample assessments without official calculations.",
  Reports: "Preview and export fictional records as CSV.",
  "Staff & Access": "Review staff roles and non-operative control previews.",
  Settings: "Review display, security, and proposed integration settings.",
};

export function SisDashboard() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Overview");
  const [darkMode, setDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const students: Student[] = [];
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classEditorOpen, setClassEditorOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      demoDataSource.listClasses(),
      demoDataSource.listAttendance(),
      demoDataSource.listGrades(),
    ])
      .then(([classRows, attendanceRows, gradeRows]) => {
        if (!active) return;
        setClasses(classRows.map((schoolClass) => ({ ...schoolClass })));
        setAttendance(attendanceRows.map((record) => ({ ...record })));
        setGrades(gradeRows.map((grade) => ({ ...grade })));
        setDataReady(true);
      })
      .catch((error: unknown) => {
        console.error("Unable to load local SIS demo records.", error);
        if (active) setDataError("Local demo records could not be loaded. Refresh to try again.");
      });

    return () => {
      active = false;
    };
  }, []);

  const heading = useMemo(() => {
    if (section === "Classes" && selectedClassId) {
      return classLabel(classes.find((item) => item.id === selectedClassId));
    }
    return section === "Overview" ? "School operations" : section;
  }, [classes, section, selectedClassId]);

  function navigate(next: Section) {
    if (next === "Students") {
      router.push("/dashboard/students");
      return;
    }

    setSection(next);
    setMobileMenuOpen(false);
    setFeedback("");
    if (next !== "Classes") setSelectedClassId(null);
  }

  function openStudent(student: Student) {
    router.push(
      `/dashboard/students/${encodeURIComponent(student.id)}`,
    );
  }

  function saveClass(draft: Omit<SchoolClass, "id">) {
    if (editingClassId) {
      setClasses((current) =>
        current.map((schoolClass) =>
          schoolClass.id === editingClassId
            ? { ...schoolClass, ...draft }
            : schoolClass,
        ),
      );
      setFeedback("Class preview updated in temporary local state.");
    } else {
      const created: SchoolClass = {
        ...draft,
        id: `demo-class-${Date.now()}`,
      };
      setClasses((current) => [...current, created]);
      setSelectedClassId(created.id);
      setFeedback("Fictional class added to temporary local state.");
    }
    setClassEditorOpen(false);
  }

  function updateAttendance(record: AttendanceRecord) {
    setAttendance((current) => {
      const existing = current.findIndex(
        (item) => item.date === record.date && item.studentId === record.studentId,
      );
      if (existing < 0) return [...current, record];
      return current.map((item, index) => (index === existing ? record : item));
    });
  }

  const editingClass =
    classes.find((schoolClass) => schoolClass.id === editingClassId) ?? null;

  return (
    <div className={darkMode ? "dark" : ""} style={{ colorScheme: darkMode ? "dark" : "light" }}>
      <div className="min-h-screen bg-[#f4f4f8] text-slate-900 dark:bg-[#0d0d11] dark:text-slate-100">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#15151b] lg:flex">
          <Brand />
          <SidebarNavigation section={section} onSelect={navigate} />
          <div className="mt-auto border-t border-slate-100 p-4 dark:border-white/10">
            <div className="rounded-md border border-violet-400/15 bg-violet-500/[0.06] p-3">
              <p className="text-xs font-semibold text-violet-950 dark:text-violet-100">Local preview</p>
              <p className="mt-1 text-[11px] leading-4 text-violet-900/75 dark:text-violet-100/70">Temporary synthetic data only. Changes may reset after refresh.</p>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-800 dark:text-violet-200">I</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">Staff workspace</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Authenticated area</p></div>
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
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex"><DemoMark /></span>
                <button type="button" onClick={() => setDarkMode((dark) => !dark)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={`${buttonClass} size-9 px-0`}><Icon name={darkMode ? "sun" : "moon"} className="size-[17px]" /></button>
                <details className="relative">
                  <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-violet-800 hover:bg-slate-50 dark:border-white/15 dark:bg-[#19191f] dark:text-violet-200 dark:hover:bg-white/[0.07]" aria-label="Open account menu">I</summary>
                  <div className="absolute right-0 top-11 z-40 w-56 rounded-md border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#19191f]">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Authenticated staff</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Role and account actions remain server-authorized.</p>
                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10"><SignOutButton /></div>
                  </div>
                </details>
              </div>
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
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">International Intellectual Resource School · IIRS</p>
                <h1 className="text-[23px] font-semibold tracking-tight text-slate-950 dark:text-white">{heading}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descriptions[section]}</p>
              </div>
              {section === "Overview" && <button type="button" onClick={() => navigate("Students")} className={primaryButtonClass}><Icon name="users" className="size-4" /> Open students</button>}
              {section === "Classes" && !selectedClassId && <button type="button" onClick={() => { setEditingClassId(null); setClassEditorOpen(true); }} className={`${primaryButtonClass} sm:hidden`}><Icon name="plus" className="size-4" /> Add class</button>}
            </div>

            {dataError && <p role="alert" className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-800 dark:text-rose-200">{dataError}</p>}
            {!dataReady && !dataError && <p role="status" className="mb-4 text-xs text-slate-500 dark:text-slate-400">Loading local preview records…</p>}
            {feedback && <div role="status" className="mb-4 flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200"><span>{feedback}</span><button type="button" onClick={() => setFeedback("")} aria-label="Dismiss message" className="rounded p-1 hover:bg-emerald-500/10"><Icon name="close" className="size-4" /></button></div>}

            {section === "Overview" && <OverviewSection classes={classes} attendance={attendance} onNavigate={navigate} />}
            {section === "Classes" && <ClassesSection classes={classes} students={students} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId} onAdd={() => { setEditingClassId(null); setClassEditorOpen(true); }} onEdit={(schoolClass) => { setEditingClassId(schoolClass.id); setClassEditorOpen(true); }} onOpenStudent={openStudent} />}
            {section === "Attendance" && <AttendanceSection students={students} classes={classes} records={attendance} onChange={updateAttendance} />}
            {section === "Grades" && <GradesSection students={students} classes={classes} grades={grades} onAddGrade={(grade) => setGrades((current) => [grade, ...current])} />}
            {section === "Reports" && <ReportsSection students={students} classes={classes} attendance={attendance} grades={grades} />}
            {section === "Staff & Access" && <StaffSection />}
            {section === "Settings" && <SettingsSection darkMode={darkMode} onDarkMode={setDarkMode} />}

            <footer className="mt-8 border-t border-slate-200 py-4 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-500">
              Overview and non-student sections remain local previews. The Students module uses Supabase records.
            </footer>
          </main>
        </div>
      </div>

      {classEditorOpen && <ClassEditor key={editingClass?.id ?? "new-class"} schoolClass={editingClass} onClose={() => setClassEditorOpen(false)} onSave={saveClass} />}
    </div>
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

function ClassEditor({
  schoolClass,
  onClose,
  onSave,
}: {
  schoolClass: SchoolClass | null;
  onClose: () => void;
  onSave: (draft: Omit<SchoolClass, "id">) => void;
}) {
  const [grade, setGrade] = useState(schoolClass?.grade ?? "");
  const [section, setSection] = useState(schoolClass?.section ?? "");
  const [room, setRoom] = useState(schoolClass?.room ?? "");
  const [teacher, setTeacher] = useState(schoolClass?.teacher ?? "");
  const [shift, setShift] = useState(schoolClass?.shift ?? "");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ grade: grade.trim(), section: section.trim(), room: room.trim(), teacher: teacher.trim(), shift: shift.trim() });
  }

  return (
    <Modal title={schoolClass ? "Edit class · demo" : "Add class · demo"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-md border border-violet-400/20 bg-violet-500/[0.06] p-3 text-xs leading-5 text-violet-900 dark:text-violet-100">This class is only a local preview. Grade levels, sections, academic years, and school schedules must be confirmed before production use.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Illustrative grade"><input required maxLength={60} value={grade} onChange={(event) => setGrade(event.target.value)} className={fieldClass} placeholder="e.g. Grade 8" autoFocus /></FormField>
          <FormField label="Section"><input required maxLength={20} value={section} onChange={(event) => setSection(event.target.value)} className={fieldClass} placeholder="e.g. A" /></FormField>
          <FormField label="Room label"><input maxLength={60} value={room} onChange={(event) => setRoom(event.target.value)} className={fieldClass} placeholder="Optional" /></FormField>
          <FormField label="Teacher example"><input maxLength={100} value={teacher} onChange={(event) => setTeacher(event.target.value)} className={fieldClass} placeholder="Optional" /></FormField>
          <FormField label="Shift example"><select value={shift} onChange={(event) => setShift(event.target.value)} className={fieldClass}><option value="">Not specified</option><option>Morning</option><option>Afternoon</option></select></FormField>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10"><button type="button" onClick={onClose} className={buttonClass}>Cancel</button><button type="submit" className={primaryButtonClass}>{schoolClass ? "Save preview changes" : "Add demo class"}</button></div>
      </form>
    </Modal>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <label className="block space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{label}{children}</label>;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute inset-0 cursor-default bg-black/60" />
      <section role="dialog" aria-modal="true" aria-labelledby="modal-heading" className="relative z-10 my-auto max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#17171d] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3"><h2 id="modal-heading" className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="close" className="size-4" /></button></div>
        {children}
      </section>
    </div>
  );
}

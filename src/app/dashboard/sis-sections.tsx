"use client";

import { useEffect, useMemo, useState } from "react";
import {
  demoStaff,
} from "@/lib/sis/demo-data";
import type {
  AttendanceRecord,
  AttendanceStatus,
  GradeRecord,
  SchoolClass,
  Student,
} from "@/lib/sis/types";
import {
  buttonClass,
  DemoMark,
  EmptyState,
  fieldClass,
  Icon,
  Panel,
  primaryButtonClass,
  SectionTitle,
  StatusBadge,
} from "./sis-ui";

export function OverviewSection({
  classes,
  attendance,
  onNavigate,
}: {
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  onNavigate: (section: "Students" | "Classes" | "Attendance" | "Reports") => void;
}) {
  const present = attendance.filter((record) => record.status === "Present").length;
  const missing = attendance.filter((record) => record.status === "Missing").length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-violet-400/20 bg-violet-500/[0.07] px-4 py-3 text-sm text-violet-950 dark:text-violet-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <DemoMark />
            <p className="max-w-3xl text-xs leading-5 text-violet-900/80 dark:text-violet-100/75">
              Local prototype workspace. Preview content is synthetic and temporary. The Students directory is a separate staff-only Supabase module.
            </p>
          </div>
          <span className="text-xs font-medium text-violet-800 dark:text-violet-200">
            Preview data only
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Demo classes" value={String(classes.length)} note="Illustrative structure" icon="book" />
        <Metric label="Attendance today" value={`${present} present`} note={`${missing} missing · sample entries`} icon="calendar" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel className="p-5">
          <SectionTitle title="Office shortcuts" detail="Common preview workflows" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Shortcut icon="users" title="Student directory" detail="Find and review student records" onClick={() => onNavigate("Students")} />
            <Shortcut icon="calendar" title="Attendance review" detail="Update a local demo register" onClick={() => onNavigate("Attendance")} />
            <Shortcut icon="book" title="Class rosters" detail="Open classes and assigned students" onClick={() => onNavigate("Classes")} />
            <Shortcut icon="file" title="Build a report" detail="Preview and export demo CSVs" onClick={() => onNavigate("Reports")} />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Needs attention" detail="Examples from fictional records" />
          <ul className="mt-4 space-y-3">
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">Attendance not recorded</span>
              <StatusBadge status={`${missing} missing`} />
            </li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Counts are calculated only from the local preview set, not from IIRS records.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel className="p-5">
          <SectionTitle title="Recent activity" detail="Synthetic examples · no real audit events" />
          <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
            {[
              ["Student record added", "Demo profile · Students", "10:42"],
              ["Attendance status changed", "Illustrative register · Grade 8 A", "09:18"],
              ["Class roster viewed", "Demo class · Grade 7 B", "Yesterday"],
            ].map(([title, detail, time]) => (
              <div key={title} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{time}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Data source status" detail="Proposed architecture · not connected" />
          <div className="mt-4 space-y-3">
            <ConnectionRow title="Google Sheets" detail="Attendance and selected records, pending design" />
            <ConnectionRow title="Supabase" detail="Staff access, metadata and private file mappings" />
            <ConnectionRow title="Student photos" detail="Private storage workflow not configured" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: "users" | "check" | "book" | "calendar";
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <Icon name={icon} className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">{note}</p>
    </Panel>
  );
}

function Shortcut({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: "users" | "calendar" | "book" | "file";
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] items-center gap-3 rounded-md border border-slate-200 p-3 text-left hover:border-violet-300 hover:bg-violet-50/60 dark:border-white/10 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/[0.06]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300"><Icon name={icon} className="size-[18px]" /></span>
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{title}</span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
    </button>
  );
}

function ConnectionRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-white/10">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <StatusBadge status="Not connected" />
    </div>
  );
}

export function StudentsSection({
  students,
  classes,
  attendance,
  grades,
  selectedStudent,
  onSelectStudent,
  onBack,
  onAdd,
  onEdit,
}: {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (student: Student) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [classId, setClassId] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students
      .filter((student) => {
        const schoolClass = classes.find((item) => item.id === student.classId);
        const searchable = `${student.name} ${student.id} ${schoolClass ? classLabel(schoolClass) : ""}`.toLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (status === "All statuses" || student.status === status) &&
          (classId === "all" || student.classId === classId)
        );
      })
      .sort((a, b) =>
        sort === "id"
          ? a.id.localeCompare(b.id)
          : sort === "enrollment"
            ? b.enrollmentDate.localeCompare(a.enrollmentDate)
            : a.name.localeCompare(b.name),
      );
  }, [classes, classId, search, sort, status, students]);

  if (selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        schoolClass={classes.find((item) => item.id === selectedStudent.classId)}
        attendance={attendance.filter((item) => item.studentId === selectedStudent.id)}
        grades={grades.filter((item) => item.studentId === selectedStudent.id)}
        onBack={onBack}
        onEdit={() => onEdit(selectedStudent)}
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:px-5">
        <SectionTitle title="Student directory" detail={`${rows.length} matching fictional records · preview changes are temporary`} />
        <div className="flex items-center gap-2"><DemoMark /><button type="button" onClick={onAdd} className={primaryButtonClass}><Icon name="plus" className="size-4" /> Add student</button></div>
      </div>
      <div className="grid gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_200px_180px]">
        <label className="relative">
          <span className="sr-only">Search name or student ID</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or student ID" className={`${fieldClass} pl-9`} />
        </label>
        <label className="sr-only" htmlFor="student-status-filter">Enrollment status</label>
        <select id="student-status-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={fieldClass}>
          <option>All statuses</option><option>Active</option><option>Inactive</option><option>Pending</option>
        </select>
        <label className="sr-only" htmlFor="student-class-filter">Class</label>
        <select id="student-class-filter" value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }} className={fieldClass}>
          <option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
        </select>
        <label className="sr-only" htmlFor="student-sort">Sort students</label>
        <select id="student-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className={fieldClass}>
          <option value="name">Sort: name</option><option value="id">Sort: student ID</option><option value="enrollment">Sort: newest enrollment</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[690px] text-left">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400">
            <tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Enrollment status</th><th className="px-4 py-3">Enrolled</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {pageRows.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.025]">
                <td className="px-5 py-3"><button type="button" onClick={() => onSelectStudent(student)} className="text-left text-sm font-medium text-slate-800 hover:text-violet-700 dark:text-slate-200 dark:hover:text-violet-300">{student.name}</button></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{student.id}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{classes.find((item) => item.id === student.classId) ? classLabel(classes.find((item) => item.id === student.classId)!) : "Unassigned"}</td>
                <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{student.enrollmentDate}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={5}><EmptyState title="No demo students found" detail="Try changing your search or filters." /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-white/10 sm:px-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {pageCount} · {rows.length} demo records</p>
        <div className="flex gap-2">
          <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button type="button" className={buttonClass} disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </Panel>
  );
}

function StudentProfile({
  student,
  schoolClass,
  attendance,
  grades,
  onBack,
  onEdit,
}: {
  student: Student;
  schoolClass?: SchoolClass;
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setPhotoError("Choose an image file under 5 MB.");
      event.target.value = "";
      return;
    }
    if (photo) URL.revokeObjectURL(photo);
    setPhotoError("");
    setPhoto(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={`${buttonClass} px-2.5`}><Icon name="arrow" className="size-4 rotate-180" /> Back to students</button>
        <button type="button" onClick={onEdit} className={buttonClass}><Icon name="edit" className="size-4" /> Edit demo record</button>
      </div>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          {photo ? (
            <div role="img" aria-label={`Local preview for ${student.name}`} style={{ backgroundImage: `url("${photo}")` }} className="size-20 rounded-full bg-cover bg-center" />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-violet-500/10 text-xl font-semibold text-violet-700 dark:text-violet-200">{initials(student.name)}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">Student profile · demo</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{student.name}</h2>
            <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{student.id} · {schoolClass ? classLabel(schoolClass) : "Class unassigned"}</p>
          </div>
          <StatusBadge status={student.status} />
          <label className={`${buttonClass} cursor-pointer`}>
            <Icon name="camera" className="size-4" /> Choose photo
            <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
          </label>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Photo is previewed in this browser only. It is not uploaded or saved. {photoError}</p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title="Personal information" detail="Synthetic profile details" />
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
            <Detail label="Gender" value={student.gender || "Not provided"} />
            <Detail label="Date of birth" value={student.dateOfBirth || "Not provided"} />
            <Detail label="Phone" value={student.phone || "Not provided"} />
            <Detail label="Guardian" value={student.guardian || "Not provided"} />
            <Detail label="Village" value={student.village || "Not provided"} />
            <Detail label="Notes" value={student.notes || "No notes"} />
          </dl>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Enrollment details" detail="Student ID patterns and school policy are not configured" />
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
            <Detail label="Student ID" value={student.id} />
            <Detail label="Status" value={student.status} />
            <Detail label="Enrolled" value={student.enrollmentDate} />
            <Detail label="Class assignment" value={schoolClass ? classLabel(schoolClass) : "Unassigned"} />
          </dl>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Attendance history" detail="Illustrative sample records" />
          <div className="mt-3 space-y-2">
            {attendance.length ? attendance.map((record) => <div key={`${record.date}-${record.classId}`} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-white/10"><span className="text-sm text-slate-700 dark:text-slate-200">{record.date}</span><StatusBadge status={record.status} /></div>) : <EmptyState title="No attendance sample" detail="There are no demo attendance entries for this student." />}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Grades and academic records" detail="No official report-card calculations" />
          <div className="mt-3 space-y-2">
            {grades.length ? grades.map((grade) => <div key={grade.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-white/10"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{grade.subject}</p><p className="text-xs text-slate-500 dark:text-slate-400">{grade.assessment} · {grade.recordedOn}</p></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{grade.score}</span></div>) : <EmptyState title="No grade samples" detail="No illustrative grade records are available for this student." />}
          </div>
        </Panel>
        <Panel className="p-5 xl:col-span-2">
          <SectionTitle title="Relevant history" detail="Illustrative record context only · not an audit log" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3 dark:border-white/10">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Enrollment example</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{student.enrollmentDate || "Date not provided"} · fictional preview entry</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-white/10">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Current class assignment</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{schoolClass ? classLabel(schoolClass) : "Unassigned"} · derived from local demo state</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3 dark:border-white/10">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

export function ClassesSection({
  classes,
  students,
  selectedClassId,
  onSelectClass,
  onAdd,
  onEdit,
  onOpenStudent,
}: {
  classes: SchoolClass[];
  students: Student[];
  selectedClassId: string | null;
  onSelectClass: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (schoolClass: SchoolClass) => void;
  onOpenStudent: (student: Student) => void;
}) {
  const selected = classes.find((schoolClass) => schoolClass.id === selectedClassId);
  if (selected) {
    const roster = students.filter((student) => student.classId === selected.id);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => onSelectClass(null)} className={buttonClass}><Icon name="arrow" className="size-4 rotate-180" /> Back to classes</button>
          <button type="button" onClick={() => onEdit(selected)} className={buttonClass}><Icon name="edit" className="size-4" /> Edit demo class</button>
        </div>
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">Class details · demo</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{classLabel(selected)}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selected.room} · {selected.shift} shift</p></div>
            <DemoMark />
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3"><Detail label="Teacher example" value={selected.teacher || "Not assigned"} /><Detail label="Room example" value={selected.room || "Not assigned"} /><Detail label="Demo roster size" value={String(roster.length)} /></dl>
        </Panel>
        <Panel>
          <div className="p-5"><SectionTitle title="Student roster" detail={`${roster.length} fictional assigned student records`} /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">{roster.map((student) => <tr key={student.id}><td className="px-5 py-3"><button type="button" onClick={() => onOpenStudent(student)} className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">{student.name}</button></td><td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{student.id}</td><td className="px-4 py-3"><StatusBadge status={student.status} /></td></tr>)}</tbody>
            </table>
            {!roster.length && <EmptyState title="No demo students assigned" detail="The roster will show local preview students assigned to this class." />}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-white/10">
        <SectionTitle title="Class directory" detail="Illustrative class labels; official structure and academic year are not set" />
        <button type="button" onClick={onAdd} className={primaryButtonClass}><Icon name="plus" className="size-4" /> Add class</button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((schoolClass) => {
          const count = students.filter((student) => student.classId === schoolClass.id).length;
          return (
            <button type="button" key={schoolClass.id} onClick={() => onSelectClass(schoolClass.id)} className="rounded-md border border-slate-200 p-4 text-left hover:border-violet-300 hover:bg-violet-50/50 dark:border-white/10 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/[0.05]">
              <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{classLabel(schoolClass)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{schoolClass.room} · {schoolClass.shift}</p></div><Icon name="arrow" className="size-4 text-slate-400" /></div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-white/10"><span className="text-slate-500 dark:text-slate-400">{schoolClass.teacher || "Teacher not assigned"}</span><span className="font-medium text-slate-700 dark:text-slate-300">{count} students</span></div>
            </button>
          );
        })}
      </div>
      {!classes.length && <EmptyState title="No demo classes" detail="Add a class preview to explore class details and rosters." />}
    </Panel>
  );
}

export function AttendanceSection({
  students,
  classes,
  records,
  onChange,
}: {
  students: Student[];
  classes: SchoolClass[];
  records: AttendanceRecord[];
  onChange: (record: AttendanceRecord) => void;
}) {
  const [date, setDate] = useState("2026-10-27");
  const [classId, setClassId] = useState("all");
  const [search, setSearch] = useState("");
  const shownStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();
    const schoolClass = classes.find((item) => item.id === student.classId);
    return (
      (classId === "all" || student.classId === classId) &&
      (!query || `${student.name} ${student.id} ${schoolClass ? classLabel(schoolClass) : ""}`.toLowerCase().includes(query))
    );
  });
  const byStudent = new Map(records.filter((record) => record.date === date).map((record) => [record.studentId, record]));

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle title="Attendance register" detail="Change a status to update this browser's temporary demo state" />
          <DemoMark />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${fieldClass} mt-1.5`} /></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className={`${fieldClass} mt-1.5`}><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or student ID" className={`${fieldClass} mt-1.5`} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(["Present", "Absent", "Late", "Excused", "Missing", "Unverified"] as AttendanceStatus[]).map((status) => <StatusBadge key={status} status={`${shownStudents.filter((student) => (byStudent.get(student.id)?.status ?? "Missing") === status).length} ${status.toLowerCase()}`} />)}
        </div>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Record status</th><th className="px-4 py-3">Change status · demo</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {shownStudents.map((student) => {
                const record = byStudent.get(student.id);
                const current = record?.status ?? "Missing";
                return <tr key={student.id}>
                  <td className="px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{student.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{student.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{classes.find((item) => item.id === student.classId) ? classLabel(classes.find((item) => item.id === student.classId)!) : "Unassigned"}</td>
                  <td className="px-4 py-3"><StatusBadge status={current} /><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{record ? "Demo record" : "No record for this date"}</p></td>
                  <td className="px-4 py-3"><label className="sr-only" htmlFor={`attendance-${student.id}`}>Attendance status for {student.name}</label><select id={`attendance-${student.id}`} value={current} onChange={(event) => onChange({ studentId: student.id, classId: student.classId, date, status: event.target.value as AttendanceStatus })} className={`${fieldClass} max-w-40`}><option>Present</option><option>Absent</option><option>Late</option><option>Excused</option><option>Missing</option><option>Unverified</option></select></td>
                </tr>;
              })}
            </tbody>
          </table>
          {!shownStudents.length && <EmptyState title="No students in this view" detail="Adjust the class filter or search terms." />}
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400">
          Missing means no demo attendance row exists for the selected date. Unverified is a sample status, not a confirmed QR scan. Google Sheets is not connected; no source sheet or database was changed.
        </div>
      </Panel>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Future QR attendance sync</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Integration and source mapping are not configured.</p></div>
        <StatusBadge status="Not connected" />
      </Panel>
    </div>
  );
}

export function GradesSection({
  students,
  classes,
  grades,
  onAddGrade,
}: {
  students: Student[];
  classes: SchoolClass[];
  grades: GradeRecord[];
  onAddGrade: (grade: GradeRecord) => void;
}) {
  const [classId, setClassId] = useState("all");
  const [studentId, setStudentId] = useState("all");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ subject: "", assessment: "", score: "" });
  const filteredStudents = students.filter((student) => classId === "all" || student.classId === classId);
  const visibleGrades = grades.filter((grade) => {
    const student = students.find((item) => item.id === grade.studentId);
    return (!student || classId === "all" || student.classId === classId) && (studentId === "all" || grade.studentId === studentId);
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId || studentId === "all" || !form.subject.trim() || !form.assessment.trim() || !form.score.trim()) {
      setMessage("Select a student and complete each field to preview a grade entry.");
      return;
    }
    onAddGrade({
      id: `grade-demo-${Date.now()}`,
      studentId,
      subject: form.subject.trim(),
      assessment: form.assessment.trim(),
      score: form.score.trim(),
      recordedOn: new Date().toISOString().slice(0, 10),
    });
    setMessage("Added to temporary local demo state only.");
    setForm({ subject: "", assessment: "", score: "" });
  }

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><SectionTitle title="Grades overview" detail="Illustrative grade entries only · grading policy is not configured" /><DemoMark /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setStudentId("all"); }} className={`${fieldClass} mt-1.5`}><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Student<select value={studentId} onChange={(event) => setStudentId(event.target.value)} className={`${fieldClass} mt-1.5`}><option value="all">All students</option>{filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.id}</option>)}</select></label>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.8fr)]">
        <Panel>
          <div className="p-5"><SectionTitle title="Assessment records" detail={`${visibleGrades.length} synthetic entries`} /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Illustrative score</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">{visibleGrades.map((grade) => <tr key={grade.id}><td className="px-5 py-3 text-sm text-slate-800 dark:text-slate-200">{students.find((student) => student.id === grade.studentId)?.name ?? "Unknown demo student"}</td><td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{grade.subject}</td><td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{grade.assessment}<p className="text-[10px]">{grade.recordedOn}</p></td><td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{grade.score}</td></tr>)}</tbody>
            </table>
            {!visibleGrades.length && <EmptyState title="No grade samples" detail="No grades are available for this selection." />}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Grade-entry form preview" detail="No report-card calculations are performed" />
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Student<select required value={studentId === "all" ? "" : studentId} onChange={(event) => setStudentId(event.target.value)} className={`${fieldClass} mt-1.5`}><option value="">Select a student</option>{filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.id}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Subject<input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="Illustrative subject" /></label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Assessment<input required value={form.assessment} onChange={(event) => setForm({ ...form, assessment: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="e.g. Sample quiz" /></label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Score<input required value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="e.g. 16 / 20" /></label>
            <button type="submit" className={`${primaryButtonClass} w-full`}>Add demo grade</button>
            {message && <p role="status" className="text-xs text-violet-700 dark:text-violet-300">{message}</p>}
          </form>
        </Panel>
      </div>
      <p className="rounded-md border border-amber-400/20 bg-amber-500/[0.06] p-4 text-xs leading-5 text-amber-900 dark:text-amber-100">Grade scales, weighting, terms, and report-card calculations require school approval. Sample scores are not official academic results.</p>
    </div>
  );
}

type ReportKind = "Student directory" | "Enrollment status" | "Attendance" | "Grades";

export function ReportsSection({
  students,
  classes,
  attendance,
  grades,
}: {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
}) {
  const [report, setReport] = useState<ReportKind>("Student directory");
  const [classId, setClassId] = useState("all");
  const classRows = students.filter((student) => classId === "all" || student.classId === classId);
  const selectedAttendance = attendance.filter((record) => classId === "all" || record.classId === classId);
  const selectedGrades = grades.filter((grade) => classId === "all" || students.find((student) => student.id === grade.studentId)?.classId === classId);

  const headers =
    report === "Attendance"
      ? ["Date", "Student ID", "Student", "Class", "Attendance status"]
      : report === "Grades"
        ? ["Student ID", "Student", "Subject", "Assessment", "Illustrative score", "Date"]
        : ["Student ID", "Student", "Class", "Enrollment status", "Enrollment date"];
  const rows =
    report === "Attendance"
      ? selectedAttendance.map((record) => [record.date, record.studentId, students.find((student) => student.id === record.studentId)?.name ?? "", classLabel(classes.find((item) => item.id === record.classId)), record.status])
      : report === "Grades"
        ? selectedGrades.map((grade) => [grade.studentId, students.find((student) => student.id === grade.studentId)?.name ?? "", grade.subject, grade.assessment, grade.score, grade.recordedOn])
        : classRows.map((student) => [student.id, student.name, classLabel(classes.find((item) => item.id === student.classId)), report === "Enrollment status" ? student.status : student.status, student.enrollmentDate]);
  const count = rows.length;

  function exportCsv() {
    const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `iirs-demo-${report.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><SectionTitle title="Reports workspace" detail="Preview contains only fictional local demo data" /><DemoMark /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px_auto]">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Report type<select value={report} onChange={(event) => setReport(event.target.value as ReportKind)} className={`${fieldClass} mt-1.5`}><option>Student directory</option><option>Enrollment status</option><option>Attendance</option><option>Grades</option></select></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Class filter<select value={classId} onChange={(event) => setClassId(event.target.value)} className={`${fieldClass} mt-1.5`}><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
          <div className="flex items-end"><button type="button" onClick={exportCsv} className={`${primaryButtonClass} w-full sm:w-auto`}><Icon name="download" className="size-4" /> Export demo CSV</button></div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Exported file includes DEMO identifiers and synthetic records only. It does not contain school data.</p>
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-white/10"><SectionTitle title={`${report} preview`} detail={`${count} rows · demo`} /><span className="text-xs text-slate-500 dark:text-slate-400">No school-specific report policies applied</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 first:pl-5">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">{rows.slice(0, 10).map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="px-4 py-3 text-xs text-slate-700 first:pl-5 dark:text-slate-300">{cell || "—"}</td>)}</tr>)}</tbody>
          </table>
          {!rows.length && <EmptyState title="No preview rows" detail="There are no demo records for the selected report filters." />}
          {rows.length > 10 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Showing first 10 of {rows.length} rows. CSV export includes all filtered rows.</p>}
        </div>
      </Panel>
    </div>
  );
}

export function StaffSection() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [deactivation, setDeactivation] = useState("");

  function previewInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(email.includes("@") ? `Invitation preview prepared for ${email}. No account was created.` : "Enter an email address to preview an invitation.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-400/20 bg-amber-500/[0.06] p-4 text-xs leading-5 text-amber-900 dark:text-amber-100">Staff controls below are previews only. No account can be invited, deactivated, or assigned permissions from this page.</div>
      <Panel>
        <div className="p-5"><SectionTitle title="Staff directory preview" detail="Synthetic account examples · no real staff details" action={<DemoMark />} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-white/[0.025] dark:text-slate-400"><tr><th className="px-5 py-3">Staff member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Preview action</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/10">{demoStaff.map((member) => <tr key={member.email}><td className="px-5 py-3"><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{member.email}</p></td><td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{member.role}</td><td className="px-4 py-3"><StatusBadge status={member.status} /></td><td className="px-4 py-3"><button type="button" onClick={() => setDeactivation(`Preview only: ${member.name} would be selected for deactivation. No account state changed.`)} className={buttonClass}>Preview deactivation</button></td></tr>)}</tbody></table></div>
        {deactivation && <p role="status" className="border-t border-slate-100 px-5 py-3 text-xs text-violet-700 dark:border-white/10 dark:text-violet-300">{deactivation}</p>}
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title="Invitation preview" detail="Role selection does not grant any real access" />
          <form onSubmit={previewInvite} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Work email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="name@example.invalid" /></label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Preview role<select className={`${fieldClass} mt-1.5`}><option>Office Staff</option><option>Administrator</option></select></label>
            <button type="submit" className={primaryButtonClass}>Preview invitation</button>
            {notice && <p role="status" className="text-xs text-violet-700 dark:text-violet-300">{notice}</p>}
          </form>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Permission overview" detail="Illustrative role boundaries; production policy must be approved" />
          <div className="mt-4 space-y-3">
            <Permission role="Administrator" text="Staff and system administration (preview only)." />
            <Permission role="Office Staff" text="Student, class, attendance, and report workflows (preview only)." />
            <p className="rounded-md border border-slate-200 p-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400">Real authorization remains enforced server-side. This interface does not update staff profiles or permissions.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Permission({ role, text }: { role: string; text: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-violet-500/10 text-violet-700 dark:text-violet-300"><Icon name="shield" className="size-4" /></span><div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{role}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p></div></div>;
}

type SettingsTab = "General" | "Display" | "Staff & access" | "Attendance" | "Data sources" | "Security & audit";

export function SettingsSection({
  darkMode,
  onDarkMode,
}: {
  darkMode: boolean;
  onDarkMode: (value: boolean) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("General");
  const tabs: SettingsTab[] = ["General", "Display", "Staff & access", "Attendance", "Data sources", "Security & audit"];

  return (
    <div className="space-y-4">
      <Panel className="overflow-x-auto">
        <nav aria-label="Settings pages" className="flex min-w-max gap-1 border-b border-slate-100 px-3 dark:border-white/10">
          {tabs.map((name) => <button type="button" key={name} onClick={() => setTab(name)} aria-current={tab === name ? "page" : undefined} className={`border-b-2 px-3 py-3 text-xs font-medium ${tab === name ? "border-violet-500 text-violet-700 dark:text-violet-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{name}</button>)}
        </nav>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><SectionTitle title={tab} detail="Preview settings · no production configuration changed" /><DemoMark /></div>
          <div className="mt-5">
            {tab === "General" && <SettingsGroup title="System preferences" detail="School-specific values remain unset.">
              <SettingLine label="System label" description="Temporary product label for this prototype."><span className="text-sm text-slate-700 dark:text-slate-300">School SIS · IIRS</span></SettingLine>
              <SettingLine label="School name" description="Confirmed from the user; no other branding inferred."><span className="text-sm text-slate-700 dark:text-slate-300">International Intellectual Resource School</span></SettingLine>
              <SettingLine label="Academic year" description="Awaiting the school's calendar and year naming convention."><StatusBadge status="Not configured" /></SettingLine>
            </SettingsGroup>}
            {tab === "Display" && <SettingsGroup title="Theme and display" detail="The selected theme applies only in this page session.">
              <SettingLine label="Color theme" description={darkMode ? "Dark interface is selected." : "Light interface is selected."}><button type="button" onClick={() => onDarkMode(!darkMode)} className={buttonClass}><Icon name={darkMode ? "sun" : "moon"} className="size-4" /> Switch to {darkMode ? "light" : "dark"}</button></SettingLine>
              <SettingLine label="Dense tables" description="Display preference can be decided after staff testing."><StatusBadge status="Not configured" /></SettingLine>
            </SettingsGroup>}
            {tab === "Staff & access" && <SettingsGroup title="Staff access configuration" detail="Existing server-side staff authorization remains in place.">
              <SettingLine label="Self-registration" description="No public staff registration route is provided."><StatusBadge status="Disabled" /></SettingLine>
              <SettingLine label="Role model" description="Current foundation recognizes Administrator and Office Staff."><StatusBadge status="Preview" /></SettingLine>
            </SettingsGroup>}
            {tab === "Attendance" && <SettingsGroup title="Attendance integration" detail="The current QR attendance sheet is not contacted.">
              <SettingLine label="Google Sheets" description="Source spreadsheet, columns, and sync direction require owner confirmation."><StatusBadge status="Not connected" /></SettingLine>
              <SettingLine label="QR attendance sync" description="No credentials, requests, or data transfers exist in this prototype."><StatusBadge status="Not configured" /></SettingLine>
            </SettingsGroup>}
            {tab === "Data sources" && <SettingsGroup title="Proposed data architecture" detail="Data-source implementation is intentionally isolated from page presentation.">
              <SettingLine label="Google Sheets" description="Candidate source for existing QR attendance and selected structured records."><StatusBadge status="Not connected" /></SettingLine>
              <SettingLine label="Supabase Auth / database" description="Staff identity, authorization, file metadata, mappings, and sync state are design candidates."><StatusBadge status="Not connected" /></SettingLine>
              <SettingLine label="Supabase Storage" description="Private student-photo and document storage is not configured."><StatusBadge status="Not configured" /></SettingLine>
            </SettingsGroup>}
            {tab === "Security & audit" && <SettingsGroup title="Security and audit history" detail="This screen does not represent live audit events.">
              <SettingLine label="Staff authorization" description="Protected dashboard verifies active staff on the server."><StatusBadge status="Existing foundation" /></SettingLine>
              <SettingLine label="Audit history" description="No production audit records are being read or written."><StatusBadge status="No demo events" /></SettingLine>
              <SettingLine label="Local preview edits" description="Changes remain in browser memory and may reset on refresh."><StatusBadge status="Temporary" /></SettingLine>
            </SettingsGroup>}
          </div>
        </div>
      </Panel>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">School-specific settings and integration decisions are listed in the project architecture notes. No credentials or connection status are inferred.</p>
    </div>
  );
}

function SettingsGroup({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return <div><div className="mb-3"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p></div><div className="divide-y divide-slate-100 dark:divide-white/10">{children}</div></div>;
}

function SettingLine({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div>{children}</div>;
}

export function classLabel(schoolClass?: SchoolClass) {
  return schoolClass ? `${schoolClass.grade} · ${schoolClass.section}` : "Unassigned";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

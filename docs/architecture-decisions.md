# SIS prototype: decisions to confirm

The current interface is a local preview using fictional records. It does not read or write Google Sheets, Supabase data, or Supabase Storage. Staff authentication and server-side authorization remain separate from this demo data.

Before connecting real records, confirm:

- The existing student ID format, whether IDs may change, and how duplicate IDs are prevented.
- Which system owns student, class, enrollment, and attendance records (Google Sheets, Supabase, or a staged combination).
- The existing sheet structure, stable row identifiers, ownership, permissions, and conflict-resolution rules.
- The school's grade levels, class/section naming, academic calendar, terms, attendance statuses, and grading/report-card rules.
- Which staff roles and per-action permissions are required, and who may invite, deactivate, or restore accounts.
- Which student and guardian fields are necessary, retention periods, consent requirements, and local privacy obligations.
- Private file bucket policies, upload limits, file metadata, retention, and authorized access to photos/documents.
- Google Sheets synchronization direction, frequency, checkpoints, retry behavior, audit events, and operational ownership.

The `DEMO-` IDs, grade/section examples, schedules, attendance entries, assessments, and staff names in the prototype are illustrative only. They are not IIRS records or policies. No migration or external integration is included.
